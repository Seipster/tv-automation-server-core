import { Meteor } from 'meteor/meteor'
import { StudioInstallations, MappingExt, MappingsExt, StudioInstallation } from '../../lib/collections/StudioInstallations'
import {
	MappingCasparCG,
	MappingAtem,
	MappingAtemType,
	MappingLawo,
	MappingHyperdeck,
	MappingHyperdeckType,
	Mapping,
	MappingLawoType,
	MappingPanasonicPtz,
	MappingPanasonicPtzType,
	MappingPharos,
	MappingAbstract,
	DeviceType as PlayoutDeviceType
} from 'timeline-state-resolver-types'
import { literal, getCurrentTime, Optional } from '../../lib/lib'
import { SourceLayerType, LookaheadMode } from 'tv-automation-sofie-blueprints-integration'
import { PeripheralDevices, PeripheralDevice } from '../../lib/collections/PeripheralDevices'
import { PeripheralDeviceAPI } from '../../lib/api/peripheralDevice'
import { logger } from '../logging'
import * as _ from 'underscore'
import { setMeteorMethods } from '../methods'
import { ShowStyleBases } from '../../lib/collections/ShowStyleBases'

// Imports from TSR (TODO make into an import)
// export interface Mappings {
// 	[layerName: string]: Mapping
// }
// export interface Mapping {
// 	device: PlayoutDeviceType,
// 	deviceId: string,
// 	channel?: number,
// 	layer?: number
// 	// [key: string]: any
// }

// export enum MappingAtemType {
// 	MixEffect,
// 	DownStreamKeyer,
// 	SuperSourceBox,
// 	Auxilliary,
// 	MediaPlayer
// }
// export enum PlayoutDeviceType { // moved to PlayoutDeviceType in PeripheripheralDevices
// 	ABSTRACT = 0,
// 	CASPARCG = 1,
// 	ATEM = 2,
// 	LAWO = 3,
// 	HTTPSEND = 4
// }
// const literal = <T>(o: T) => o

setMeteorMethods({
	'initDB': (really) => {

		if (!really) {
			return 'Do you really want to do this? You chould only do it when initializing a new database. Confirm with initDB(true).'
		}
		logger.info('initDB')
		Meteor.call('initDB_layers', really)

		PeripheralDevices.upsert('initDBPlayoutDeviceParent', {$set: literal<PeripheralDevice>({
			_id: 'initDBPlayoutDeviceParent',
			name: 'initDBPlayoutDeviceParent',
			type: PeripheralDeviceAPI.DeviceType.PLAYOUT,
			studioInstallationId: 'studio0',
			created: getCurrentTime(),
			status: {statusCode: PeripheralDeviceAPI.StatusCode.BAD},
			lastSeen: getCurrentTime(),
			lastConnected: getCurrentTime(),
			connected: false,
			connectionId: null,
			token: '',
			settings: {
				devices: {},
				mediaScanner: {
					host: '',
					port: 8000
				}
			}
		})})

		PeripheralDevices.find({
			type: PeripheralDeviceAPI.DeviceType.PLAYOUT
		}).forEach((pd) => {
			PeripheralDevices.update(pd._id, {$set: {
				'settings.devices.casparcg0': ((pd['settings'] || {})['devices'] || {})['casparcg0'] || {
					type: PlayoutDeviceType.CASPARCG,
					options: {
						host: '160.67.87.50',
						port: 5250,
						launcherHost: '160.67.87.50',
						launcherPort: 8005
					}
				},
				'settings.devices.casparcg1': ((pd['settings'] || {})['devices'] || {})['casparcg1'] || {
					type: PlayoutDeviceType.CASPARCG,
					options: {
						host: '',
						port: 5250,
						launcherHost: '',
						launcherPort: 8005
					}
				},
				'settings.devices.atem0': ((pd['settings'] || {})['devices'] || {})['atem0'] || {
					type: PlayoutDeviceType.ATEM,
					options: {
						host: '160.67.87.51',
						port: 9910
					}
				},
				'settings.devices.lawo0': ((pd['settings'] || {})['devices'] || {})['lawo0'] || {
					type: PlayoutDeviceType.LAWO,
					options: {
						host: '160.67.96.51',
						port: 9000,
						sourcesPath: 'Sapphire.Sources',
						rampMotorFunctionPath: '1.5.2'
					}
				},
				'settings.devices.abstract0': ((pd['settings'] || {})['devices'] || {})['abstract0'] || {
					type: PlayoutDeviceType.ABSTRACT,
					options: {
					}
				},
				'settings.devices.http0': ((pd['settings'] || {})['devices'] || {})['http0'] || {
					type: PlayoutDeviceType.HTTPSEND,
					options: {
					}
				},
				'settings.devices.hyperdeck0': ((pd['settings'] || {})['devices'] || {})['hyperdeck0'] || {
					type: PlayoutDeviceType.HYPERDECK,
					options: {
						host: '160.67.87.53',
						port: 9993
					}
				},
			}})
			// PeripheralDevices.update(pd._id, {$set: {
			// 	mappings: mappings
			// }})
		})
		_.each(((PeripheralDevices.findOne('initDBPlayoutDeviceParent') || {})['settings'] || {}).devices, (device, key) => {
			PeripheralDevices.upsert('initDBPlayoutDevice' + key, {$set: literal<PeripheralDevice>({
				_id: 'initDBPlayoutDevice' + key,
				name: 'initDBPlayoutDevice' + key,
				type: PeripheralDeviceAPI.DeviceType.OTHER,
				studioInstallationId: 'studio0',
				parentDeviceId: 'initDBPlayoutDeviceParent',
				created: getCurrentTime(),
				status: {statusCode: PeripheralDeviceAPI.StatusCode.BAD},
				lastSeen: getCurrentTime(),
				lastConnected: getCurrentTime(),
				connected: false,
				connectionId: null,
				token: ''
			})})
		})

		PeripheralDevices.upsert('initDBMosDeviceParent', {$set: literal<PeripheralDevice>({
			_id: 'initDBMosDeviceParent',
			name: 'initDBMosDeviceParent',
			type: PeripheralDeviceAPI.DeviceType.MOSDEVICE,
			studioInstallationId: 'studio0',
			created: getCurrentTime(),
			status: {statusCode: PeripheralDeviceAPI.StatusCode.BAD},
			lastSeen: getCurrentTime(),
			lastConnected: getCurrentTime(),
			connected: false,
			connectionId: null,
			token: ''
		})})

		PeripheralDevices.find({
			type: PeripheralDeviceAPI.DeviceType.MOSDEVICE
		}).forEach((pd) => {
			PeripheralDevices.update(pd._id, {$set: {
				'settings.mosId': 'SOFIE1.XPRO.MOS',
				'settings.devices.enps0': ((pd['settings'] || {})['devices'] || {})['enps0'] || {
					primary: {
						id: 'MAENPSTEST14',
						host: '160.67.149.155'
					},
					secondary: {
						id: 'MAENPSTEST15',
						host: '160.67.149.156'
					}
				},
			}})
			// PeripheralDevices.update(pd._id, {$set: {
			// 	mappings: mappings
			// }})
		})
	},
	'initDB_layers': (really) => {

		if (!really) {
			return 'Do you really want to do this? You chould only do it when initializing a new database. Confirm with initDB(true).'
		}
		// Create outputLayers:
		StudioInstallations.update('studio0', {$set: {
			outputLayers: [
				{
					_id: 'pgm0',
					name: 'PGM',
					isPGM: true,
					_rank: 0
				},
				{
					_id: 'monitor0',
					name: 'Bakskjerm',
					isPGM: false,
					_rank: 1
				}
			],
		}})
		// Create sourceLayers:
		StudioInstallations.update('studio0', {$set: {
			sourceLayers: [
				{
					_id: 'studio0_vignett',
					_rank: 7000,
					name: 'Vignett',
					abbreviation: 'Full',
					type: SourceLayerType.VT,
					onPGMClean: true,
					onPresenterScreen: true,
					unlimited: false
				},
				{
					_id: 'studio0_vb',
					_rank: 8000,
					name: 'VB',
					abbreviation: 'Full',
					type: SourceLayerType.VT,
					onPGMClean: true,
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
					_id: 'studio0_live_speak0',
					_rank: 9000,
					name: 'STK',
					abbreviation: 'STK',
					type: SourceLayerType.LIVE_SPEAK,
					onPGMClean: true,
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
					_id: 'studio0_graphics_super',
					_rank: 1000,
					name: 'Super',
					type: SourceLayerType.GRAPHICS,
					onPGMClean: false,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'u,alt+u',
					allowDisable: true,
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_fullskjerm',
				 	_rank: 12000,
				 	name: 'Grafikk',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
				 	_id: 'studio0_graphics_klokke',
				 	_rank: 15000,
				 	name: 'Klokke',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					isHidden: true,
					assignHotkeysToGlobalAdlibs: true,
					activateKeyboardHotkeys: 'alt+k,alt+u',
					clearKeyboardHotkey: 'k',
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_logo',
				 	_rank: 16000,
				 	name: 'Logo',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					isHidden: true,
					assignHotkeysToGlobalAdlibs: true,
					activateKeyboardHotkeys: 'alt+l,alt+k,alt+u',
					clearKeyboardHotkey: 'l',
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_tag_left',
				 	_rank: 2000,
				 	name: 'Arkiv',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'alt+u',
					allowDisable: true,
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_tag_right',
				 	_rank: 3000,
				 	name: 'Direkte',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'alt+d,alt+u',
					allowDisable: true,
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_tema',
				 	_rank: 4000,
				 	name: 'Tema',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'i,alt+i,alt+u',
					allowDisable: true,
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_ticker',
				 	_rank: 5000,
				 	name: 'Ticker',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'alt+o,alt+u',
					allowDisable: true,
					unlimited: false
				},
				{
				 	_id: 'studio0_graphics_bakskjerm',
				 	_rank: 17000,
				 	name: 'Bakskjerm',
				 	type: SourceLayerType.GRAPHICS,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'p',
					unlimited: false
				},
				{
				 	_id: 'studio0_clip_bakskjerm',
				 	_rank: 17000,
				 	name: 'Bakskjerm',
				 	type: SourceLayerType.VT,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'p',
					unlimited: false
				},
				{
				 	_id: 'studio0_cam_bakskjerm',
				 	_rank: 17000,
				 	name: 'Bakskjerm',
				 	type: SourceLayerType.REMOTE,
					onPGMClean: true,
					activateKeyboardHotkeys: 'q,w,e,r,t,y',
					clearKeyboardHotkey: 'p',
					unlimited: false
				},
				{
					_id: 'studio0_split0',
					_rank: 11000,
					name: 'Split',
					abbreviation: 'DVE',
					type: SourceLayerType.SPLITS,
					onPGMClean: true,
					isSticky: true,
					activateStickyKeyboardHotkey: 'f6',
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
					_id: 'studio0_remote0',
					_rank: 10000,
					name: 'DIR',
					abbreviation: 'DIR',
					type: SourceLayerType.REMOTE,
					onPGMClean: true,
					activateKeyboardHotkeys: '1,2,3,4,5,6',
					clearKeyboardHotkey: 'ctrl+a,ctrl+1',
					isRemoteInput: true,
					assignHotkeysToGlobalAdlibs: true,
					isSticky: true,
					activateStickyKeyboardHotkey: 'f5',
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
					_id: 'studio0_script',
					_rank: 14000,
					name: 'Manus',
					type: SourceLayerType.SCRIPT,
					onPGMClean: true,
					unlimited: false
				},
				{
					_id: 'studio0_gjest_mic',
					_rank: 15000,
					name: 'Gjest',
					type: SourceLayerType.MIC,
					onPGMClean: true,
					unlimited: false,
					isGuestInput: true
				},
				{
					_id: 'studio0_camera0',
					_rank: 13000,
					name: 'Kam',
					abbreviation: 'K ',
					type: SourceLayerType.CAMERA,
					onPGMClean: true,
					activateKeyboardHotkeys: 'f1,f2,f3,f4,8,9',
					clearKeyboardHotkey: 'ctrl+a,ctrl+f1',
					assignHotkeysToGlobalAdlibs: true,
					onPresenterScreen: true,
					unlimited: false,
					exclusiveGroup: 'fullscreen_pgm'
				},
				{
					_id: 'studio0_live_transition0',
					_rank: 0,
					name: 'Transition',
					type: SourceLayerType.TRANSITION,
					onPGMClean: true,
					activateKeyboardHotkeys: '',
					assignHotkeysToGlobalAdlibs: false,
					unlimited: false
				},
				{
					_id: 'studio0_hyperdeck0',
					_rank: 0,
					name: 'Hyperdeck',
					type: SourceLayerType.UNKNOWN,
					onPGMClean: true,
					activateKeyboardHotkeys: '',
					assignHotkeysToGlobalAdlibs: false,
					unlimited: false,
					isHidden: true
				},
				{
					_id: 'studio0_ptz',
					_rank: 13000,
					name: 'KamPos',
					abbreviation: 'K ',
					type: SourceLayerType.CAMERA_MOVEMENT,
					onPGMClean: true,
					unlimited: true
				},
				{
					_id: 'studio0_audio_bed',
					_rank: 0,
					name: 'Bed',
					type: SourceLayerType.AUDIO,
					onPGMClean: true,
					activateKeyboardHotkeys: '',
					assignHotkeysToGlobalAdlibs: false,
					unlimited: false,
					isHidden: true
				},
				{
					_id: 'studio0_host_light',
					_rank: 0,
					name: 'HostLight',
					type: SourceLayerType.LIGHTS,
					onPGMClean: false,
					activateKeyboardHotkeys: '',
					assignHotkeysToGlobalAdlibs: false,
					unlimited: false,
					isHidden: true
				}
			],
		}})
		// Create Timeline mappings:
		const mappings: MappingsExt = { // Logical layers and their mappings
			'core_abstract': literal<MappingAbstract & MappingExt>({
				device: PlayoutDeviceType.ABSTRACT,
				deviceId: 'abstract0',
				lookahead: LookaheadMode.NONE,
			}),
			'casparcg_player_wipe': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 3,
				layer: 199
			}),
			'casparcg_player_vignett': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 3,
				layer: 140
			}),
			'casparcg_player_soundeffect': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 3,
				layer: 130
			}),
			'casparcg_player_clip': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.PRELOAD,
				channel: 1,
				layer: 110
			}),
			'casparcg_player_clip_next': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 4,
				layer: 100
			}),
			'casparcg_player_clip_next_warning': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 4,
				layer: 99
			}),
			'casparcg_player_clip2': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.PRELOAD,
				channel: 1,
				layer: 111
			}),
			'casparcg_cg_graphics': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg1',
				lookahead: LookaheadMode.NONE,
				channel: 2,
				layer: 120
			}),
			'casparcg_cg_countdown': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg1',
				lookahead: LookaheadMode.NONE,
				channel: 1,
				layer: 120
			}),
			'casparcg_player_studio': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 2,
				layer: 110
			}),
			'casparcg_cg_studiomonitor': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 2,
				layer: 120
			}),
			'casparcg_cg_effects': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg0',
				lookahead: LookaheadMode.NONE,
				channel: 3,
				layer: 120
			}),
			'casparcg_cg_fullskjerm': literal<MappingCasparCG & MappingExt>({
				device: PlayoutDeviceType.CASPARCG,
				deviceId: 'casparcg1',
				lookahead: LookaheadMode.NONE,
				channel: 3,
				layer: 110
			}),
			'atem_me_program': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.MixEffect,
				index: 0 // 0 = ME1
			}),
			'atem_me_studiomonitor': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.MixEffect,
				index: 1 // 1 = ME2
			}),
			'atem_aux_technical_error': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.Auxilliary,
				index: 1
			}),
			'atem_aux_ssrc': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.Auxilliary,
				index: 2
			}),
			'atem_aux_clean': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.Auxilliary,
				index: 5
			}),
			'atem_dsk_graphics': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.DownStreamKeyer,
				index: 0 // 0 = DSK1
			}),
			'atem_dsk_effect': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.DownStreamKeyer,
				index: 1 // 1 = DSK2
			}),
			'atem_supersource_art': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.SuperSourceProperties,
				index: 0 // 0 = SS
			}),
			'atem_supersource_default': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.SuperSourceBox,
				index: 0 // 0 = SS
			}),
			'atem_supersource_override': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.RETAIN,
				mappingType: MappingAtemType.SuperSourceBox,
				index: 0 // 0 = SS
			}),
			'atem_usk_effect_default': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.MixEffect,
				index: 0 // 0 = ME1
			}),
			'atem_usk_effect_override': literal<MappingAtem & MappingExt>({
				device: PlayoutDeviceType.ATEM,
				deviceId: 'atem0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingAtemType.MixEffect,
				index: 0 // 0 = ME1
			}),
			'lawo_source_automix': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'AMix',
			}),
			'lawo_source_wl2': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'WL2',
			}),
			'lawo_source_wl3': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'WL3',
			}),
			'lawo_source_clip': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'MP1',
			}),
			'lawo_source_effect': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'FX',
			}),
			'lawo_source_rm1': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM1',
			}),
			'lawo_source_rm2': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM2',
			}),
			'lawo_source_rm3': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM3',
			}),
			'lawo_source_rm4': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM4',
			}),
			'lawo_source_rm5': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM5',
			}),
			'lawo_source_rm6': literal<MappingLawo & MappingExt>({
				device: PlayoutDeviceType.LAWO,
				deviceId: 'lawo0',
				lookahead: LookaheadMode.NONE,
				mappingType: MappingLawoType.SOURCE,
				identifier: 'RM6',
			}),
			'nora_primary_super': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_headline': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_tag_left': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_tag_right': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_ticker': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_tema': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_logo': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_primary_klokke': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_effects_fullskjerm': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_studio_bakskjerm': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.NONE,
			}),
			'nora_fullskjerm_fullskjerm': literal<Mapping & MappingExt>({
				device: PlayoutDeviceType.HTTPSEND,
				deviceId: 'http0',
				lookahead: LookaheadMode.PRELOAD,
			}),
			'hyperdeck0': literal<MappingHyperdeck & MappingExt>({
				device: PlayoutDeviceType.HYPERDECK,
				deviceId: 'hyperdeck0',
				mappingType: MappingHyperdeckType.TRANSPORT,
				lookahead: LookaheadMode.NONE,
			}),
			'ptz0_preset': literal<MappingPanasonicPtz & MappingExt>({
				device: PlayoutDeviceType.PANASONIC_PTZ,
				deviceId: 'ptz0',
				mappingType: MappingPanasonicPtzType.PRESET,
				lookahead: LookaheadMode.WHEN_CLEAR
			}),
			'ptz0_speed': literal<MappingPanasonicPtz & MappingExt>({
				device: PlayoutDeviceType.PANASONIC_PTZ,
				deviceId: 'ptz0',
				mappingType: MappingPanasonicPtzType.PRESET_SPEED,
				lookahead: LookaheadMode.WHEN_CLEAR
			}),
			'pharos_lights': literal<MappingPharos & MappingExt>({
				device: PlayoutDeviceType.PHAROS,
				deviceId: 'pharos0',
				lookahead: LookaheadMode.NONE
			}),
			'lights_host': literal<MappingAbstract & MappingExt>({
				device: PlayoutDeviceType.ABSTRACT,
				deviceId: 'abstract0',
				lookahead: LookaheadMode.NONE
			}),
			'lights_guest': literal<MappingAbstract & MappingExt>({
				device: PlayoutDeviceType.ABSTRACT,
				deviceId: 'abstract0',
				lookahead: LookaheadMode.NONE
			}),
			'lights_studio': literal<MappingAbstract & MappingExt>({
				device: PlayoutDeviceType.ABSTRACT,
				deviceId: 'abstract0',
				lookahead: LookaheadMode.NONE
			}),
		}
		StudioInstallations.update('studio0', {$set: {
			mappings: mappings
		}})

		ShowStyleBases.upsert('show0', {$set: {
			name: 'Distriktsnyheter Sørlandet'
		}})
	},
	'initDB_config': (really) => {

		if (!really) {
			return 'Do you really want to do this? You chould only do it when initializing a new database. Confirm with initDB(true).'
		}
		// initializes the stuff that's not place specific (so not setting things hat has ip adresses, etc)
		// Initiate database:
		StudioInstallations.upsert('studio0', {$set: literal<Optional<StudioInstallation>>({
			_id: 'studio0',
			name: 'DKSL',
			defaultShowStyleVariant: 'show0-variant0',
			config: [
				{_id: 'nora_group', value: ''}, // Note: do not set to ensure that devs do not accidently use the live graphics channel
				{_id: 'nora_apikey', value: ''}, // Note: must not be set as apikey must be kept private
				// {_id: 'media_previews_url', value: 'http://localhost:8000/'},
				// {_id: 'sofie_url', value: 'http://sllxsofie01'},
				{_id: 'metadata_url', value: 'http://160.67.87.105'},
				{_id: 'atemSSrcBackground', value: '/opt/playout-gateway/static/atem-mp/split_overlay.rgba'},
				{_id: 'atemSSrcBackground2', value: '/opt/playout-gateway/static/atem-mp/teknisk_feil.rgba'},
				{_id: 'sources_kam', value: '1:1,2:2,3:3,4:4,8:11,9:12'},
				{_id: 'sources_kam_ptz', value: '1:ptz0'},
				{_id: 'sources_rm', value: '1:5,2:6,3:7,4:8,5:9,6:10'}
			],
			// mappings: {},
			// supportedShowStyleBase: [],
			// runtimeArguments: []
		})})
	}
})
