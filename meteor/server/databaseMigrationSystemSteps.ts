import { addMigrationStep, MigrationStep, addMigrationSteps, MigrationStepBase } from './databaseMigration'
import { StudioInstallation, StudioInstallations, DBStudioInstallation, ISourceLayer, IOutputLayer, Mapping, MappingHyperdeck, MappingPanasonicPtz, MappingHyperdeckType, MappingPanasonicPtzType } from '../lib/collections/StudioInstallations'
import { Mongo } from 'meteor/mongo'
import * as _ from 'underscore'
import { MigrationStepInput, MigrationStepInputFilteredResult } from '../lib/api/migration'
import { Collections, objectPathGet, objectPathSet, literal } from '../lib/lib'
import { Meteor } from 'meteor/meteor'
import { ShowStyles } from '../lib/collections/ShowStyles'
import { RunningOrderAPI } from '../lib/api/runningOrder'
import { PlayoutDeviceType, PeripheralDevices, PlayoutDeviceSettings, PlayoutDeviceSettingsDevice, PlayoutDeviceSettingsDeviceCasparCG, PlayoutDeviceSettingsDeviceAtem, PlayoutDeviceSettingsDeviceHyperdeck, PlayoutDeviceSettingsDevicePanasonicPTZ, PeripheralDevice } from '../lib/collections/PeripheralDevices'
import { LookaheadMode, PlayoutAPI } from '../lib/api/playout'
import { PeripheralDeviceAPI } from '../lib/api/peripheralDevice'
import { compareVersions, parseVersion } from '../lib/collections/CoreSystem'
import { logger } from './logging'

/**
 * This file contains all system specific migration steps.
 * These files are combined with / overridden by migration steps defined in the blueprints.
 */

/**
 * Convenience function to generate basic test
 * @param collectionName
 * @param selector
 * @param property
 * @param value
 * @param inputType
 * @param label
 * @param description
 * @param defaultValue
 */
function ensureCollectionProperty<T = any> (
	collectionName: string,
	selector: Mongo.Selector<T>,
	property: string,
	value: any | null, // null if manual
	inputType?: 'text' | 'multiline' | 'int' | 'checkbox' | 'dropdown' | 'switch', // EditAttribute types
	label?: string,
	description?: string,
	defaultValue?: any
): MigrationStepBase {
	let collection: Mongo.Collection<T> = Collections[collectionName]
	if (!collection) throw new Meteor.Error(404, `Collection ${collectionName} not found`)

	return {
		id: `${collectionName}.${property}`,
		canBeRunAutomatically: (_.isNull(value) ? false : true),
		validate: () => {
			let objects = collection.find(selector).fetch()
			let propertyMissing: string | boolean = false
			_.each(objects, (obj: any) => {
				if (!objectPathGet(obj, property)) propertyMissing = `${property} is missing on ${obj._id}`
			})

			return propertyMissing
		},
		input: () => {
			let objects = collection.find(selector).fetch()

			let inputs: Array<MigrationStepInput> = []
			_.each(objects, (obj: any) => {

				let localLabel = (label + '').replace(/\$id/g, obj._id)
				let localDescription = (description + '').replace(/\$id/g, obj._id)
				if (inputType && !obj[property]) {
					inputs.push({
						label: localLabel,
						description: localDescription,
						inputType: inputType,
						attribute: obj._id,
						defaultValue: defaultValue
					})
				}
			})
			return inputs
		},
		migrate: (input: MigrationStepInputFilteredResult) => {

			if (value) {
				let objects = collection.find(selector).fetch()
				_.each(objects, (obj: any) => {
					if (obj && objectPathGet(obj, property) !== value) {
						let m = {}
						m[property] = value
						logger.info(`Migration: Setting ${collectionName} object "${obj._id}".${property} to ${value}`)
						collection.update(obj._id,{$set: m })
					}
				})
			} else {
				_.each(input, (value, objectId: string) => {
					if (!_.isUndefined(value)) {
						let obj = collection.findOne(objectId)
						if (obj && objectPathGet(obj, property) !== value) {
							let m = {}
							m[property] = value
							logger.info(`Migration: Setting ${collectionName} object "${objectId}".${property} to ${value}`)
							collection.update(objectId,{$set: m })
						}
					}
				})
			}
		}
	}
}
/**
 * Convenience function to generate basic test
 * øparam type
 */
function ensurePlayoutDevicesHost (
	deviceType: PlayoutDeviceType = -1
): MigrationStepBase | null {
	let collection: Mongo.Collection<any> = Collections.PeripheralDevices
	if (!collection) throw new Meteor.Error(404, `Collection PeripheralDevices not found`)

	let allDevices = {}

	// iterate over playout gateways
	collection.find({'type': PeripheralDeviceAPI.DeviceType.PLAYOUT}).fetch().forEach((playoutGw) => {
		let devices: PlayoutDeviceSettings = objectPathGet(playoutGw, 'settings.devices', {})
		// filter on device-type unless devicetype === -1
		if (deviceType > -1) {
			devices = _.pick(devices, (device) => device.type === deviceType)
		}
		allDevices[playoutGw._id] = devices
	})

	// iterate over devices for gateways
	_.each(allDevices, (devices, key) => {
		allDevices[key] = _.pick(devices, (device) => {
			// let foundHostProp = objectPathGet(device, 'options.host', null) // @ TODOD: switch this in instead of that under
			let foundHostProp = objectPathGet(device, 'options.host', '')
			if (typeof foundHostProp === 'string') {
				// if host is string but length is 0, then add to mossingHostDevices
				return foundHostProp.trim().length === 0
			}

			// shouldn't have host, ignore
			return false
		})
	})	

	// create migrationsteps for all affected devices
	return {
		id: `ensureHostOnDevicesOfType${deviceType > -1 ? deviceType : 'All'}`,
		canBeRunAutomatically: false,
		validate: () => {
			for (let key in allDevices) {
				if (!_.isEmpty(allDevices[key])) {
					return 'Some playout devices are missing host'
				}
			}
			return true
		},
		input: () => {
			// let objects = collection.find(selector).fetch()
			let inputs: Array<MigrationStepInput> = []
			
			_.each(allDevices, (devices: {[key:string]: PlayoutDeviceSettingsDevice}, gatewayId: string) => {
				_.each(devices, (device: PlayoutDeviceSettingsDevice, deviceId: string) => {
					inputs.push({
						label: `Playout device "${deviceId}" on gateway "${gatewayId}" is missing host`,
						description: `Host for device "${deviceId}"`,
						inputType: 'text',
						attribute: `${gatewayId}.${deviceId}`,
						defaultValue: null
					})
				})			
			})			
			return inputs
		},
		migrate: (input: MigrationStepInputFilteredResult) => {
			_.each(input, (devices, objectId: string) => {
				let gateway = collection.findOne(objectId)
				
				let newHosts = _.pick(devices, newHost => newHost !== undefined)
				let oldDevices = objectPathGet(gateway, 'settings.devices', {})
				_.each(newHosts, (host, device) => {
					objectPathSet(oldDevices, `${device}.options.host`, host)
				})

				logger.info(`Migration: Setting hosts on devices for gateway ${objectId}`)
					collection.update(objectId,{$set: {
						settings: {
							devices: oldDevices
						}
					}})
			})
		}
	}
}
function ensureStudioConfig (
	configName: string,
	value: any | null, // null if manual
	inputType?: 'text' | 'multiline' | 'int' | 'checkbox' | 'dropdown' | 'switch', // EditAttribute types
	label?: string,
	description?: string,
	defaultValue?: any
): MigrationStepBase {

	return {
		id: `studioConfig.${configName}`,
		canBeRunAutomatically: (_.isNull(value) ? false : true),
		validate: () => {
			let studios = StudioInstallations.find().fetch()
			let configMissing: string | boolean = false
			_.each(studios, (studio: StudioInstallation) => {
				let config = _.find(studio.config, (c) => {
					return c._id === configName
				})
				if (!config) {
					configMissing = `${configName} is missing on ${studio._id}`
				}
			})

			return configMissing
		},
		input: () => {
			let studios = StudioInstallations.find().fetch()

			let inputs: Array<MigrationStepInput> = []
			_.each(studios, (studio: StudioInstallation) => {
				let config = _.find(studio.config, (c) => {
					return c._id === configName
				})

				let localLabel = (label + '').replace(/\$id/g, studio._id)
				let localDescription = (description + '').replace(/\$id/g, studio._id)
				if (inputType && !studio[configName]) {
					inputs.push({
						label: localLabel,
						description: localDescription,
						inputType: inputType,
						attribute: studio._id,
						defaultValue: config && config.value ? config.value : defaultValue
					})
				}
			})
			return inputs
		},
		migrate: (input: MigrationStepInputFilteredResult) => {

			let studios = StudioInstallations.find().fetch()
			_.each(studios, (studio: StudioInstallation) => {
				let value2: any = undefined
				if (!_.isNull(value)) {
					value2 = value
				} else {
					value2 = input[studio._id]
				}
				if (!_.isUndefined(value2)) {
					let config = _.find(studio.config, (c) => {
						return c._id === configName
					})
					let doUpdate: boolean = false
					if (config) {
						if (config.value !== value2) {
							doUpdate = true
							config.value = value2
						}
					} else {
						doUpdate = true
						studio.config.push({
							_id: configName,
							value: value2
						})
					}
					if (doUpdate) {
						logger.info(`Migration: Setting Studio config "${configName}" to ${value2}`)
						StudioInstallations.update(studio._id,{$set: {
							config: studio.config
						}})
					}
				}
			})
		}
	}
}

function ensureSourceLayer (sourceLayer: ISourceLayer): MigrationStepBase {
	return {
		id: `sourceLayer.${sourceLayer._id}`,
		canBeRunAutomatically: true,
		validate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let sl = _.find(studio.sourceLayers, (sl) => {
				return sl._id === sourceLayer._id
			})

			if (!sl) return `SourceLayer ${sourceLayer._id} missing`
			return false
		},
		migrate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let sl = _.find(studio.sourceLayers, (sl) => {
				return sl._id === sourceLayer._id
			})

			if (!sl) {
				logger.info(`Migration: Adding Studio sourceLayer "${sourceLayer._id}" to ${studio._id}`)
				StudioInstallations.update(studio._id, {$push: {
					'sourceLayers': sourceLayer
				}})
			}
		}
	}
}
function ensureOutputLayer (outputLayer: IOutputLayer): MigrationStepBase {
	return {
		id: `outputLayer.${outputLayer._id}`,
		canBeRunAutomatically: true,
		validate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let sl = _.find(studio.outputLayers, (sl) => {
				return sl._id === outputLayer._id
			})

			if (!sl) return `OutputLayer ${outputLayer._id} missing`
			return false
		},
		migrate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let sl = _.find(studio.outputLayers, (sl) => {
				return sl._id === outputLayer._id
			})

			if (!sl) {
				logger.info(`Migration: Adding Studio outputLayer "${outputLayer._id}" to ${studio._id}`)
				StudioInstallations.update(studio._id, {$push: {
					'outputLayers': outputLayer
				}})
			}
		}
	}
}
function ensureMapping (mappingId: string, mapping: Mapping): MigrationStepBase {
	return {
		id: `ensureMapping.${mappingId}`,
		canBeRunAutomatically: true,
		validate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings[mappingId]

			if (!dbMapping) return `Mapping ${mappingId} missing`

			return false
		},
		migrate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings[mappingId]

			if (!dbMapping) { // only add if the mapping does not exist
				let m = {}
				m['mappings.' + mappingId] = mapping
				logger.info(`Migration: Adding Studio mapping "${mappingId}" to ${studio._id}`)
				StudioInstallations.update(studio._id, {$set: m})
			}
		}
	}
}
function removeMapping (mappingId: string): MigrationStepBase {
	return {
		id: `removeMapping.${mappingId}`,
		canBeRunAutomatically: true,
		validate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings[mappingId]
			if (dbMapping) return `Mapping ${mappingId} exists`

			return false
		},
		migrate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings[mappingId]

			if (dbMapping) { // only remove if the mapping does exist
				let m = {}
				m['mappings.' + mappingId] = 1
				logger.info(`Migration: Removing Studio mapping "${mappingId}" from ${studio._id}`)
				StudioInstallations.update(studio._id, {$unset: m})
			}
		}
	}
}
function ensureDeviceVersion (id, deviceType: PeripheralDeviceAPI.DeviceType, libraryName: string, versionStr: string ): MigrationStepBase {
	return {
		id: id,
		canBeRunAutomatically: true,
		validate: () => {
			let devices = PeripheralDevices.find({type: deviceType}).fetch()

			for (let i in devices) {
				let device = devices[i]
				if (!device.expectedVersions) device.expectedVersions = {}

				let expectedVersion = device.expectedVersions[libraryName]

				if (expectedVersion) {
					try {
						if (compareVersions(parseVersion(expectedVersion), parseVersion(versionStr)) < 0) {
							return `Expected version ${libraryName}: ${expectedVersion} should be at least ${versionStr}`
						}
					} catch (e) {
						return 'Error: ' + e.toString()
					}
				} else return `Expected version ${libraryName}: not set`
			}
			return false
		},
		migrate: () => {
			let devices = PeripheralDevices.find({type: deviceType}).fetch()

			_.each(devices, (device) => {
				if (!device.expectedVersions) device.expectedVersions = {}

				let version = parseVersion(versionStr)
				let expectedVersion = device.expectedVersions[libraryName]
				if (!expectedVersion || compareVersions(parseVersion(expectedVersion), version) < 0) {
					let m = {}
					m['expectedVersions.' + libraryName] = version.toString()
					logger.info(`Migration: Updating expectedVersion ${libraryName} of device ${device._id} from "${expectedVersion}" to "${version.toString()}"`)
					PeripheralDevices.update(device._id, {$set: m})
				}
			})
		}
	}
}

// 0.16.0: These are the "default" migration steps, based around where migrations were first introduced
addMigrationSteps( '0.16.0', [
	// create studio
	{
		id: 'studio exists',
		canBeRunAutomatically: true,
		validate: () => {
			if (!StudioInstallations.findOne()) return 'No StudioInstallation found'
			return false
		},
		migrate: () => {
			// create default studio
			logger.info(`Migration: Add default studio`)
			StudioInstallations.insert({
				_id: 'studio0',
				name: '',
				defaultShowStyle: 'show0',
				outputLayers: [],
				sourceLayers: [],
				mappings: {},
				config: []
			})
		}
	},

	// create showstyle
	{
		id: 'showStyle exists',
		canBeRunAutomatically: true,
		validate: () => {
			if (!ShowStyles.findOne()) return 'No ShowStyle found'
			return false
		},
		migrate: () => {
			// create default ShowStyle:
			logger.info(`Migration: Add default showStyle`)
			ShowStyles.insert({
				_id: 'show0',
				name: '',
				templateMappings: [],
				baselineTemplate: 'baseline',
				messageTemplate: 'message',
				routerBlueprint: '',
				postProcessBlueprint: ''
			})
		}
	},

	// ensure showstyle settings
	ensureCollectionProperty('ShowStyles', {}, '_id', null, 'text', 'ShowStyle _id', 'Enter the _id of the ShowStyles', 'show0'),
	ensureCollectionProperty('ShowStyles', {}, 'name', null, 'text', 'ShowStyle "$id" Name', 'Enter the Name of the ShowStyles ""$id""'),
	ensureCollectionProperty('ShowStyles', {}, 'templateMappings', []),
	ensureCollectionProperty('ShowStyles', {}, 'baselineTemplate', '', 'text', 'Showstyle "$id" baseline blueprint:', '', 'baseline'),
	ensureCollectionProperty('ShowStyles', {}, 'messageTemplate', '', 'text', 'Showstyle "$id" message blueprint:', '', 'message'),

	// ensure studio database structure
	ensureCollectionProperty('StudioInstallations', {}, 'outputLayers', []),
	ensureCollectionProperty('StudioInstallations', {}, 'sourceLayers', []),
	ensureCollectionProperty('StudioInstallations', {}, 'mappings', {}),
	ensureCollectionProperty('StudioInstallations', {}, 'config', []),

	// sets studio properties
	ensureCollectionProperty('StudioInstallations', {}, 'name', null, 'text', 'Studio "$id" Name',
	'Enter the Name of the Studio ""$id""'),
	ensureCollectionProperty('StudioInstallations', {}, 'defaultShowStyle', null, 'text', 'Studio "$id" Default ShowStyle',
	'Enter the Default show style id for this Studio', 'show0'),

	// sets studio outputs
	ensureOutputLayer({_id: 'studio0-pgm0', _rank: 0, name: 'PGM', isPGM: true}),
	ensureOutputLayer({_id: 'studio0-monitor0', _rank: 1, name: 'Skjerm', isPGM: false}),

	// sets studio source layers
	ensureSourceLayer({'_id':'studio0_live_transition0', '_rank':0, 'name':'Transition', 'type':13, 'onPGMClean':true, 'activateKeyboardHotkeys':'', 'assignHotkeysToGlobalAdlibs':false, 'allowDisable':false, unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_super', '_rank':1000, 'name':'Super', 'type':5, 'onPGMClean':false, 'activateKeyboardHotkeys':'q, w, e, r, t, y', 'clearKeyboardHotkey':'u, alt+u', 'allowDisable':true, 'isHidden':false, 'abbreviation':'', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_tag_left', '_rank':2000, 'name':'Arkiv', 'type':5, 'onPGMClean':true, 'clearKeyboardHotkey':'alt+u', 'isHidden':false, 'allowDisable':true, 'activateKeyboardHotkeys':'q, w, e, r, t, y', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_tag_right', '_rank':3000, 'name':'Direkte', 'type':5, 'onPGMClean':true, 'clearKeyboardHotkey':'alt+d, alt+u', 'allowDisable':true, 'activateKeyboardHotkeys':'q, w, e, r, t, y', 'assignHotkeysToGlobalAdlibs':false, unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_tema', '_rank':4000, 'name':'Tema', 'type':5, 'onPGMClean':true, 'clearKeyboardHotkey':'i, alt+i, alt+u', 'allowDisable':true, 'activateKeyboardHotkeys':'q, w, e, r, t, y', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_ticker', '_rank':5000, 'name':'Ticker', 'type':5, 'onPGMClean':true, 'clearKeyboardHotkey':'alt+u, alt+o', 'allowDisable':true, unlimited: false}),
	ensureSourceLayer({'_id':'studio0_vignett', '_rank':7000, 'name':'Vignett', 'abbreviation':'Full', 'type':2, 'onPGMClean':true, 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_vb', '_rank':8000, 'name':'VB', 'abbreviation':'Full', 'type':2, 'onPGMClean':true, 'allowDisable':false, 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_live_speak0', '_rank':9000, 'name':'STK', 'abbreviation':'STK', 'type':11, 'onPGMClean':true, 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_remote0', '_rank':10000, 'name':'DIR', 'abbreviation':'DIR', 'type':3, 'onPGMClean':true, 'activateKeyboardHotkeys':'1, 2, 3, 4, 5, 6', 'isRemoteInput':true, 'assignHotkeysToGlobalAdlibs':true, 'isSticky':true, 'activateStickyKeyboardHotkey':'f5', 'clearKeyboardHotkey':'ctrl+a, ctrl+1', 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_split0', '_rank':11000, 'name':'Split', 'abbreviation':'DVE', 'type':6, 'onPGMClean':true, 'isSticky':true, 'activateStickyKeyboardHotkey':'f6', 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_fullskjerm', '_rank':12000, 'name':'Grafikk', 'type':5, 'onPGMClean':true, 'activateKeyboardHotkeys':'', 'clearKeyboardHotkey':'', 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', 'assignHotkeysToGlobalAdlibs':false, unlimited: false}),
	ensureSourceLayer({'_id':'studio0_camera0', '_rank':13000, 'name':'Kam', 'abbreviation':'K', 'type':1, 'onPGMClean':true, 'activateKeyboardHotkeys':'f1, f2, f3, f4, 8, 9', 'assignHotkeysToGlobalAdlibs':true, 'clearKeyboardHotkey':'ctrl+a, ctrl+f1', 'onPresenterScreen':true, 'exclusiveGroup':'fullscreen_pgm', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_gjest_mic', '_rank':13500, 'name':'Gjest', 'type':12, 'unlimited':false, 'onPGMClean':true, 'isGuestInput':true}),
	ensureSourceLayer({'_id':'studio0_script', '_rank':14000, 'name':'Manus', 'type':4, 'onPGMClean':true, unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_klokke', '_rank':15000, 'name':'Klokke', 'type':5, 'onPGMClean':true, 'isHidden':true, 'clearKeyboardHotkey':'alt+k, alt+u', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_graphics_logo', '_rank':16000, 'name':'Logo', 'type':5, 'onPGMClean':true, 'isHidden':true, 'clearKeyboardHotkey':'alt+l, alt+k, alt+u', 'activateKeyboardHotkeys':'', unlimited: false}),
	ensureSourceLayer({'_id':'studio0_clip_bakskjerm', '_rank':17000, 'name':'Bakskjerm', 'type':2, 'unlimited':false, 'onPGMClean':true, 'clearKeyboardHotkey':'p', 'activateKeyboardHotkeys':'q, w, e, r, t, y'}),
	ensureSourceLayer({'_id':'studio0_cam_bakskjerm', '_rank':17000, 'name':'Bakskjerm', 'type':3, 'unlimited':false, 'onPGMClean':true, 'clearKeyboardHotkey':'p', 'activateKeyboardHotkeys':'q, w, e, r, t, y', 'abbreviation':''}),
	ensureSourceLayer({'_id':'studio0_hyperdeck0', '_rank':20000, 'name':'Hyperdeck', 'type':0, 'unlimited':false, 'onPGMClean':true, 'isHidden':true}),
	ensureSourceLayer({'_id':'studio0_ptz', '_rank':20010, 'name':'PTZ', 'type':8, 'unlimited':true, 'onPGMClean':true, 'abbreviation':''}),
	ensureSourceLayer({'_id':'studio0_graphics_bakskjerm', '_rank':1000, 'name':'Bakskjerm', 'type':5, 'onPGMClean':true, 'clearKeyboardHotkey':'p', 'activateKeyboardHotkeys':'q, w, e, r, t, y', unlimited: false}),

	// sets studio mappings
	// @todo: rename caspar devices
	// @todo: offer the caspar IDs or assign automatically
	// @todo: OR: add a name attribute to caspar devices
	ensureMapping('core_abstract', {'device':0, 'deviceId':'abstract0', 'lookahead':0}),
	ensureMapping('casparcg_player_wipe', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':3, 'layer':199}),
	ensureMapping('casparcg_player_vignett', {'device':1, 'deviceId':'caspar01', 'lookahead':1, 'channel':3, 'layer':140}),
	ensureMapping('casparcg_player_soundeffect', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':3, 'layer':130}),
	ensureMapping('casparcg_player_clip', {'device':1, 'deviceId':'caspar01', 'lookahead':1, 'channel':1, 'layer':110}),
	ensureMapping('casparcg_player_clip_next', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':4, 'layer':100}),
	ensureMapping('casparcg_player_clip2', {'device':1, 'deviceId':'caspar01', 'lookahead':1, 'channel':1, 'layer':111}),
	ensureMapping('casparcg_cg_graphics', {'device':1, 'deviceId':'caspar02', 'lookahead':0, 'channel':2, 'layer':120}),
	ensureMapping('casparcg_cg_countdown', {'device':1, 'deviceId':'caspar02', 'lookahead':0, 'channel':1, 'layer':120}),
	ensureMapping('casparcg_cg_permanent', {'device':1, 'deviceId':'caspar02', 'lookahead':0, 'channel':2, 'layer':121}),
	ensureMapping('casparcg_player_studio', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':2, 'layer':121}),
	ensureMapping('casparcg_cg_studiomonitor', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':2, 'layer':120}),
	ensureMapping('casparcg_cg_effects', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':3, 'layer':120}),
	ensureMapping('casparcg_cg_fullskjerm', {'device':1, 'deviceId':'caspar02', 'lookahead':0, 'channel':3, 'layer':110}),
	ensureMapping('casparcg_player_clip_next_warning', {'device':1, 'deviceId':'caspar01', 'lookahead':0, 'channel':4, 'layer':99}),
	ensureMapping('atem_me_program', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':0, 'index':0}),
	ensureMapping('atem_me_studiomonitor', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':0, 'index':1}),
	ensureMapping('atem_aux_ssrc', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':3, 'index':2}),
	ensureMapping('atem_aux_clean', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':3, 'index':5}),
	ensureMapping('atem_dsk_graphics', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':1, 'index':0}),
	ensureMapping('atem_dsk_effect', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':1, 'index':1}),
	ensureMapping('atem_supersource_art', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':5, 'index':0}),
	ensureMapping('atem_supersource_default', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':2, 'index':0}),
	ensureMapping('atem_supersource_override', {'device':2, 'deviceId':'atem0', 'lookahead':2, 'mappingType':2, 'index':0}),
	ensureMapping('atem_usk_effect_default', {'device': 2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':0, 'index':0}),
	ensureMapping('atem_usk_effect_override', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':0, 'index':0}),
	ensureMapping('lawo_source_automix', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'AMix'}),
	ensureMapping('lawo_source_clip', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'MP1'}),
	ensureMapping('lawo_source_effect', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'FX'}),
	ensureMapping('lawo_source_rm1', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM1'}),
	ensureMapping('lawo_source_rm2', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM2'}),
	ensureMapping('lawo_source_rm3', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM3'}),
	ensureMapping('lawo_source_rm4', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM4'}),
	ensureMapping('lawo_source_rm5', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM5'}),
	ensureMapping('lawo_source_rm6', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'RM6'}),
	ensureMapping('lawo_source_wl2', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'WL2'}),
	ensureMapping('lawo_source_wl3', {'device':3, 'deviceId':'lawo0', 'lookahead':0, 'mappingType':'source', 'identifier':'WL3'}),
	ensureMapping('nora_init', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_super', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_headline', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_tag_left', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_tag_right', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_ticker', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_primary_tema', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_permanent_logo', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_permanent_klokke', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_effects_fullskjerm', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_studio_bakskjerm', {'device':4, 'deviceId':'http0', 'lookahead':0}),
	ensureMapping('nora_fullskjerm_fullskjerm', {'device':4, 'deviceId':'http0', 'lookahead':3}),
	ensureMapping('atem_aux_technical_error', {'device':2, 'deviceId':'atem0', 'lookahead':0, 'mappingType':3, 'index':0}),
	ensureMapping('ptz0_preset', {'device':5, 'deviceId':'ptz0', 'lookahead':3, 'mappingType':1}),
	ensureMapping('ptz0_speed', {'device':5, 'deviceId':'ptz0', 'mappingType':0, 'lookahead': 0}),
	ensureMapping('hyperdeck0', {'device':7, 'deviceId':'hyperdeck0', 'mappingType':'transport', 'lookahead': 0}),

	// Studio configs:
	ensureStudioConfig('media_previews_url', null, 'text', 'Studio "$id" config: media_previews_url',
		'Enter the url to the Media-previews endpoint (exposed by the CasparCG-Launcher), example: "http://192.168.0.1:8000/"', 'http://IP-ADDRESS:8000/'),
	ensureStudioConfig('sofie_url', null, 'text', 'Studio "$id" config: sofie_url',
		'Enter the url to this Sofie-application (it\'s the url in your browser), example: "http://sofie01"', 'http://URL-TO-SOFIE'),
	ensureStudioConfig('atemSSrcBackground', null, 'text', 'Studio "$id" config: atemSSrcBackground',
		'Enter the file path to ATEM SuperSource Background, example: "/opt/playout-gateway/static/atem-mp/split_overlay.rgba"'),
	ensureStudioConfig('atemSSrcBackground2', null, 'text', 'Studio "$id" config: atemSSrcBackground2',
		'Enter the file path to ATEM SuperSource Background 2, example: "/opt/playout-gateway/static/atem-mp/teknisk_feil.rgba"'),
	ensureStudioConfig('nora_group', null, 'text', 'Studio "$id" config: nora_group',
		'Enter the nora_group paramter, example: "dksl"'),
	ensureStudioConfig('nora_apikey', null, 'text', 'Studio "$id" config: nora_apikey',
		'Enter the nora_apikey parameter'),
	ensureStudioConfig('metadata_url', null, 'text', 'Studio "$id" config: metadata_url',
		'Enter the URL to the send metadata to'),
	ensureStudioConfig('sources_kam', null, 'text', 'Studio "$id" config: sources_kam',
		'Enter the sources_kam parameter (example: "1:1,2:2,3:3,4:4,8:11,9:12"'),
	ensureStudioConfig('sources_rm', null, 'text', 'Studio "$id" config: sources_rm',
		'Enter the sources_rm parameter (example: "1:5,2:6,3:7,4:8,5:9,6:10"'),
	ensureStudioConfig('sources_kam_ptz', '1:ptz0'),
	ensureStudioConfig('slack_evaluation', null, 'text', 'Studio "$id" config: slack_evaluation', 'Enter the URL to the Slack webhook (example: "https://hooks.slack.com/services/WEBHOOKURL"'),


		// @todo: agfafaf
		// "hotkeyLegend" : [
		// 	{
		// 		"_id" : "rqyu5M7ocRexnBJgn", 
		// 		"key" : "ctrl+a", 
		// 		"label" : "Fjern adlibs"
		// 	}
		// ]



		// @todo: add devices to studio installation (attaching)
		// @TODO: lappene

	// devices
	{
		id: 'playout-gateway exists',
		canBeRunAutomatically: false,
		validate: () => {
			if (!PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})) return 'Playout-gateway not found'
			return false
		},
		// Note: No migrate() function, user must fix this him/herself
		input: [{
			label: 'Playout-device 0 not set up',
			description: 'Start up the Playout-gateway and make sure it\'s connected to Sofie',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'mos-gateway exists',
		canBeRunAutomatically: false,
		validate: () => {
			if (!PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.MOSDEVICE})) return 'Mos-gateway not found'
			return false
		},
		// Note: No migrate() function, user must fix this him/herself
		input: [{
			label: 'Mos-device 0 not set up',
			description: 'Start up the Mos-gateway and make sure it\'s connected to Sofie',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.abstract0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let abstract0 = settings.devices['abstract0'] as PlayoutDeviceSettingsDevice
			if (!abstract0) return '"abstract0" missing'
			if (abstract0.type !== PlayoutDeviceType.ABSTRACT) return 'Type is not "ABSTRACT"'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let abstract0 = device.settings && device.settings.devices['abstract0']
				if (!abstract0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: abstract0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.abstract0': {
							type: PlayoutDeviceType.ABSTRACT,
							options: {}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "abstract0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "abstract0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.caspar01',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let caspar01 = settings.devices['caspar01'] as PlayoutDeviceSettingsDeviceCasparCG
			if (!caspar01) return '"caspar01" missing'

			// @ts-ignore
			if (!caspar01.options) caspar01.options = {}
			if (caspar01.type !== PlayoutDeviceType.CASPARCG) return 'Type is not "CASPARCG"'
			if (!caspar01.options.host) return 'Host is not set'
			if (!caspar01.options.launcherHost) return 'Launcher host is not set'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let caspar01 = device.settings && device.settings.devices['caspar01']
				if (!caspar01) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: caspar01`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.caspar01': {
							type: PlayoutDeviceType.CASPARCG,
							options: {
								host: '',
								port: 0,
								launcherHost: '',
								launcherPort: 0, 
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "caspar01" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "caspar01". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.caspar02',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let caspar02 = settings.devices['caspar02'] as PlayoutDeviceSettingsDeviceCasparCG
			if (!caspar02) return '"caspar02" missing'

			// @ts-ignore
			if (!caspar02.options) caspar02.options = {}
			if (caspar02.type !== PlayoutDeviceType.CASPARCG) return 'Type is not "CASPARCG"'
			if (!caspar02.options.host) return 'Host is not set'
			if (!caspar02.options.launcherHost) return 'Launcher host is not set'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let caspar02 = device.settings && device.settings.devices['caspar02']
				if (!caspar02) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: caspar02`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.caspar02': {
							type: PlayoutDeviceType.CASPARCG,
							options: {
								host: '',
								port: 0,
								launcherHost: '',
								launcherPort: 0,
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "caspar02" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "caspar02". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.atem0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let atem0 = settings.devices['atem0'] as PlayoutDeviceSettingsDeviceAtem
			if (!atem0) return '"atem0" missing'
			if (atem0.type !== PlayoutDeviceType.ATEM) return 'Type is not "ATEM"'
			if (!atem0.options.host) return 'Host is not set'
			if (!atem0.options.port) return 'Port is not set'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let atem0 = device.settings && device.settings.devices['atem0']
				if (!atem0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: atem0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.atem0': {
							type: PlayoutDeviceType.ATEM,
							options: {
								host: '',
								port: 0,
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "atem0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "atem0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.http0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let http0 = settings.devices['http0'] as PlayoutDeviceSettingsDevice
			if (!http0) return '"http0" missing'
			if (http0.type !== PlayoutDeviceType.HTTPSEND) return 'Type is not "HTTPSEND"'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let http0 = device.settings && device.settings.devices['http0']
				if (!http0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: http0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.http0': {
							type: PlayoutDeviceType.HTTPSEND,
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "http0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "http0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.lawo0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let lawo0 = settings.devices['lawo0'] as PlayoutDeviceSettingsDevice
			if (!lawo0) return '"lawo0" missing'
			if (lawo0.type !== PlayoutDeviceType.LAWO) return 'Type is not "LAWO"'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let lawo0 = device.settings && device.settings.devices['lawo0']
				if (!lawo0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: lawo0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.lawo0': {
							type: PlayoutDeviceType.LAWO,
							options: {
								host: '',
								port: 0,
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "lawo0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "lawo0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},

	{
		id: 'playout-gateway.hyperdeck0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let hyperdeck0 = settings.devices['hyperdeck0'] as PlayoutDeviceSettingsDeviceHyperdeck
			if (!hyperdeck0) return '"hyperdeck0" missing'
			// @ts-ignore
			if (!hyperdeck0.options) hyperdeck0.options = {}
			if (hyperdeck0.type !== PlayoutDeviceType.HYPERDECK) return 'Type is not "HYPERDECK"'
			if (!hyperdeck0.options.host) return 'Host is not set'
			if (!hyperdeck0.options.port) return 'Port is not set'

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let hyperdeck0 = device.settings && device.settings.devices['hyperdeck0']
				if (!hyperdeck0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: hyperdeck0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.hyperdeck0': {
							type: PlayoutDeviceType.HYPERDECK,
							options: {
								host: '',
								port: 0,
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "hyperdeck0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "hyperdeck0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},
	{
		id: 'playout-gateway.ptz0',
		canBeRunAutomatically: true,
		validate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (!device) return 'Playout-gateway not found'
			let settings = device.settings || {devices: {}} as PlayoutDeviceSettings

			let ptz0 = settings.devices['ptz0'] as PlayoutDeviceSettingsDevicePanasonicPTZ
			if (!ptz0) return '"ptz0" missing'
			// @ts-ignore
			if (!ptz0.options) ptz0.options = {}
			if (ptz0.type !== PlayoutDeviceType.PANASONIC_PTZ) return 'Type is not "PANASONIC_PTZ"'
			// let cameraDevices = ptz0.options.cameraDevices

			return false
		},
		migrate: () => {
			let device = PeripheralDevices.findOne({type: PeripheralDeviceAPI.DeviceType.PLAYOUT})
			if (device) {
				// Set some default values:
				let ptz0 = device.settings && device.settings.devices['ptz0']
				if (!ptz0) {
					logger.info(`Migration: Add PeripheralDevice.settings to ${device._id}: ptz0`)
					PeripheralDevices.update(device._id, {$set: {
						'settings.devices.ptz0': {
							type: PlayoutDeviceType.PANASONIC_PTZ,
							options: {
								host: ''
							}
						}
					}})
				}
			}
		},
		input: [{
			label: 'Playout-gateway: device "ptz0" not set up',
			description: 'Go into the settings of the Playout-gateway and setup the device "ptz0". ($validation)',
			inputType: null,
			attribute: null
		}]
	},

	// ensures all playoutdevices have hosts
	ensurePlayoutDevicesHost(),

	// parent process scanner host
	// parent process scanner port (8000)
	// caspar01 host
	// caspar01 port
	// caspar01 launcher (8005)
	// caspar02 host
	// caspar02 port
	// caspar02 launcher (8005)
	// atem host
	// atem port
	// lawo host
	// lawo port
	// hyperdeck host
	// hyperdeck port
	// ptz host

	// Todo: Mos-gateway version
	// Todo: Playout-gateway version
	// Todo: Blueprints version
	ensureDeviceVersion('ensureVersion.mosDevice', PeripheralDeviceAPI.DeviceType.MOSDEVICE, '_process', '0.1.1'),
	// ensureDeviceVersion('ensureVersion.mosDevice', PeripheralDeviceAPI.DeviceType.MOSDEVICE, '_process', '0.1.1'),
	// ensureDeviceVersion('ensureVersion.mosDevice', PeripheralDeviceAPI.DeviceType.MOSDEVICE, '_process', '0.1.1'),
	// ensureDeviceVersion('ensureVersion.mosDevice', PeripheralDeviceAPI.DeviceType.MOSDEVICE, '_process', '0.1.1'),
	// ensureDeviceVersion('ensureVersion.mosDevice', PeripheralDeviceAPI.DeviceType.MOSDEVICE, '_process', '0.1.1')



	// @todo
	// add devices to studio!!!
])

addMigrationSteps( '0.17.0', [
	// ensure showstyle settings
	ensureCollectionProperty('ShowStyles', {}, 'routerBlueprint', '', 'text', 'Showstyle "$id" rouer blueprint:', '', 'getId'),
	ensureCollectionProperty('ShowStyles', {}, 'postProcessBlueprint', '', 'text', 'Showstyle "$id" post-process blueprint:', '', 'post-process'),

	// sets config
	ensureStudioConfig('acceptedResolutions', '1920x1080i5000tff'),

	// clean up mappings
	removeMapping('nora_permanent_klokke'),
	removeMapping('nora_permanent_logo'),
	ensureMapping('nora_primary_klokke', literal<Mapping>({
		device: PlayoutDeviceType.HTTPSEND,
		deviceId: 'http0',
		lookahead: LookaheadMode.NONE,
	})),
	ensureMapping('nora_primary_logo', literal<Mapping>({
		device: PlayoutDeviceType.HTTPSEND,
		deviceId: 'http0',
		lookahead: LookaheadMode.NONE,
	})),
	removeMapping('casparcg_cg_permanent'),

	// change mappings
	{
		id: 'mapping.casparcg_player_wipe.lookahead',
		canBeRunAutomatically: true,
		validate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings['casparcg_player_wipe']
			if (!dbMapping) return false

			if (dbMapping.lookahead !== LookaheadMode.PRELOAD) return `Mapping "casparcg_player_wipe" wrong lookahead mode`

			return false
		},
		migrate: () => {
			let studio = StudioInstallations.findOne()
			if (!studio) return 'Studio not found'

			let dbMapping = studio.mappings['casparcg_player_wipe']

			if (dbMapping) { // only update if the mapping does exist
				let m = {}
				m['mappings.casparcg_player_wipe.lookahead'] = LookaheadMode.PRELOAD
				logger.info(`Migration: Updating Studio mapping "casparcg_player_wipe" in ${studio._id}`)
				StudioInstallations.update(studio._id, {$set: m})
			}
		}
	}
])


/*

Epic for tracking whats going to be released in Release3.

R2 rollbacks:
Core:  0.15.0
Mos-gateway: 0.4.0
Playout-gateway:  0.11.1
Blueprintw: #release2

Testing:
Core: r3rc3 (0.16.0), r3rc10
Mos-gateway: 0.4.2
Playout-gateway: 0.11.10
Blues: #r3fc1

CasparCG: https://github.com/nrkno/tv-automation-casparcg-server/releases/tag/v2.1.1_NRK
Launcher: https://github.com/nrkno/tv-automation-casparcg-launcher/releases/tag/v0.3.0
Scanner: https://drive.google.com/open?id=18Ud2qriJzH9ygMfizK6u9qagpWf--cfJ

Core settings:
* slack_evaluation: https://hooks.slack.com/services/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

Database updates:

Device (correct for xpro):
'settings.devices.hyperdeck0': {
    type: PlayoutDeviceType.HYPERDECK,
    options: {
        host: '160.67.87.53',
        port: 9993
    }
},
'settings.devices.ptz0': {
type: PlayoutDeviceType.PANASONIC_PTZ,
options: {
host:'160.67.87.54'
}
}

update http0 to have a make ready command (make sure to update the url):
{
    "id" : "abcde",
    "type" : "put",
    "url" : "http://nora.core.mesos.nrk.no/api/v1/renders/julian?apiKey=sofie-dev-eh47fh",
    "params" : {
        "template" : {
            "event" : "takeout"
        }
    }
}

SourceLayer:
{
    _id: 'studio0_hyperdeck0',
    _rank: 0,
    name: 'Hyperdeck',
    type: RundownAPI.SourceLayerType.UNKNOWN,
    onPGMClean: true,
    activateKeyboardHotkeys: '',
    assignHotkeysToGlobalAdlibs: false,
    unlimited: false,
    isHidden: true
},
{
    _id: 'studio0_ptz',
    _rank: 0,
    name: 'Robotics',
    type: RundownAPI.SourceLayerType.CAMERA_MOVEMENT,
    onPGMClean: true,
    activateKeyboardHotkeys: '',
    assignHotkeysToGlobalAdlibs: false,
    unlimited: true
},

Layer mapping:
'hyperdeck0': literal<MappingHyperdeck>({
    device: PlayoutDeviceType.HYPERDECK,
    deviceId: 'hyperdeck0',
    mappingType: MappingHyperdeckType.TRANSPORT,
    lookahead: LookaheadMode.NONE,
})
'ptz0_preset': literal<MappingPanasonicPtz>({
    device: PlayoutDeviceType.PANASONIC_PTZ,
    deviceId: 'ptz0',
    mappingType: MappingPanasonicPtzType.PRESET,
    lookahead: LookaheadMode.WHEN_CLEAR,
})
'ptz0_speed': literal<MappingPanasonicPtz>({
    device: PlayoutDeviceType.PANASONIC_PTZ,
    deviceId: 'ptz0',
    mappingType: MappingPanasonicPtzType.PRESET_SPEED,
    lookahead: LookaheadMode.NONE,
})

Custom Configuration:
sources_kam_ptz: 1:ptz0

(the custom config needs the layer mapping's prefixes to match the device name, so:

1:ptz0 for ptz0_preset, ptz0_speed, 2:ptz1 for ptz1_preset and ptz1_speed, etc.
)

*/
