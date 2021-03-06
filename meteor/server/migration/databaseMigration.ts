import {
	parseVersion,
	getCoreSystem,
	compareVersions,
	setCoreSystemVersion,
	Version
} from '../../lib/collections/CoreSystem'
import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'
import * as _ from 'underscore'
import { getHash } from '../lib'
import {
	MigrationMethods,
	RunMigrationResult,
	MigrationChunk,
	MigrationStepType,
	GetMigrationStatusResult
} from '../../lib/api/migration'
import {
	MigrationStepInput,
	MigrationStepInputResult,
	MigrationStepInputFilteredResult,
	MigrationStep,
	MigrationStepBase,
	MigrationContextStudio,
	ValidateFunctionCore,
	MigrateFunctionCore,
	ValidateFunctionStudio,
	ValidateFunctionShowStyle,
	MigrateFunctionStudio,
	MigrateFunctionShowStyle,
	InputFunctionCore,
	InputFunctionStudio,
	InputFunctionShowStyle,
	BlueprintMapping,
	ConfigItemValue,
	MigrationContextShowStyle,
	IBlueprintShowStyleVariant,
	ShowStyleVariantPart,
	ISourceLayer,
	IConfigItem,
	IOutputLayer
} from 'tv-automation-sofie-blueprints-integration'
import { setMeteorMethods } from '../methods'
import { logger } from '../../lib/logging'
import { storeSystemSnapshot } from '../api/snapshot'
import { ShowStyleBases, ShowStyleBase } from '../../lib/collections/ShowStyleBases'
import { Blueprints } from '../../lib/collections/Blueprints'
import { StudioInstallations, StudioInstallation } from '../../lib/collections/StudioInstallations'
import { evalBlueprints } from '../api/blueprints'
import { OmitId } from '../../lib/lib'
import { ShowStyleVariants, ShowStyleVariant } from '../../lib/collections/ShowStyleVariants'
import { Random } from 'meteor/random'

/** The current database version, x.y.z
 * 0.16.0: Release 3 (2018-10-26)
 * 0.17.0: Release 3.1 (2018-11-14)
 * 0.18.0: Release 4 (TBD)
 * 0.19.0: Release 5 (TBD)
 */
export const CURRENT_SYSTEM_VERSION = '0.19.0'

/** In the beginning, there was the database, and the database was with Sofie, and the database was Sofie.
 * And Sofie said: The version of the database is to be GENESIS_SYSTEM_VERSION so that the migration scripts will run.
 */
export const GENESIS_SYSTEM_VERSION = '0.0.0'

/**
 * These versions are not supported anymore (breaking changes occurred after these version)
 */
export const UNSUPPORTED_VERSIONS = [
	// 0.18.0 to 0.19.0: Major refactoring, (ShowStyles was split into ShowStyleBase &
	//    ShowStyleVariant, configs & layers wheremoved from studio to ShowStyles)
	'0.18.0'
]

export function isVersionSupported (version: Version) {
	let isSupported: boolean = true
	_.each(UNSUPPORTED_VERSIONS, (uv) => {
		if (compareVersions(version, parseVersion(uv)) <= 0) {
			isSupported = false
		}
	})
	return isSupported
}

interface MigrationStepInternal extends MigrationStep {
	chunk: MigrationChunk
	_rank: number
	_version: Version // step version
	_validateResult: string | boolean
}

const coreMigrationSteps: Array<MigrationStep> = []

/**
 * Add new system Migration step
 * @param step
 */
export function addMigrationStep (step: MigrationStep) {
	coreMigrationSteps.push(step)
}
/**
 * Convenience method to add multiple steps of the same version
 * @param version
 * @param steps
 */
export function addMigrationSteps (version: string, steps: Array<MigrationStepBase>) {
	_.each(steps, (step) => {
		addMigrationStep(_.extend(step, {
			version: version
		}))
	})
}

export function prepareMigration (returnAllChunks?: boolean) {

	let databaseSystem = getCoreSystem()
	if (!databaseSystem) throw new Meteor.Error(500, 'System version not set up')

	// Discover applicable migration steps:
	let allMigrationSteps: Array<MigrationStepInternal> = []
	let migrationChunks: Array<MigrationChunk> = []
	let rank: number = 0

	// Collect migration steps from core system:
	let chunk: MigrationChunk = {
		sourceType:				MigrationStepType.CORE,
		sourceName:				'system',
		_dbVersion: 			parseVersion(databaseSystem.version).toString(),
		_targetVersion: 		parseVersion(CURRENT_SYSTEM_VERSION).toString(),
		_steps:					[]
	}
	migrationChunks.push(chunk)

	_.each(coreMigrationSteps, (step) => {
		allMigrationSteps.push({
			id:						step.id,
			overrideSteps:			step.overrideSteps,
			validate:				step.validate,
			canBeRunAutomatically:	step.canBeRunAutomatically,
			migrate:				step.migrate,
			input:					step.input,
			dependOnResultFrom:		step.dependOnResultFrom,
			version: 				step.version,
			_version: 				parseVersion(step.version),
			_validateResult: 		false, // to be set later
			_rank: 					rank++,
			chunk: 					chunk
		})
	})
	// Collect migration steps from blueprints:

	Blueprints.find({}).forEach((blueprint) => {
		if (blueprint.code) {
			let bp = evalBlueprints(blueprint)

			console.log('Blueprint: ' + blueprint.name)

			// @ts-ignore
			if (!blueprint.databaseVersion || _.isString(blueprint.databaseVersion)) blueprint.databaseVersion = {}
			if (!blueprint.databaseVersion.showStyle) blueprint.databaseVersion.showStyle = {}
			if (!blueprint.databaseVersion.studio) blueprint.databaseVersion.studio = {}

			// Find all showStyles that uses this blueprint:
			let showStyleBaseIds: {[showStyleBaseId: string]: true} = {}
			let studioIds: {[studioId: string]: true} = {}
			ShowStyleBases.find({
				blueprintId: blueprint._id
			}).forEach((showStyleBase) => {
				showStyleBaseIds[showStyleBase._id] = true

				let chunk: MigrationChunk = {
					sourceType:				MigrationStepType.SHOWSTYLE,
					sourceName:				'Blueprint ' + blueprint.name + ' for showStyle ' + showStyleBase.name,
					blueprintId: 			blueprint._id,
					sourceId: 				showStyleBase._id,
					_dbVersion: 			parseVersion(blueprint.databaseVersion.showStyle[showStyleBase._id] || '0.0.0').toString(),
					_targetVersion: 		parseVersion(bp.blueprintVersion).toString(),
					_steps:					[]
				}
				migrationChunks.push(chunk)
				// Add show-style migration steps from blueprint:
				_.each(bp.showStyleMigrations, (step) => {
					allMigrationSteps.push(prefixIdsOnStep('blueprint_' + blueprint._id + '_showStyle_' + showStyleBase._id + '_', {
						id:						step.id,
						overrideSteps:			step.overrideSteps,
						validate:				step.validate,
						canBeRunAutomatically:	step.canBeRunAutomatically,
						migrate:				step.migrate,
						input:					step.input,
						dependOnResultFrom:		step.dependOnResultFrom,
						version: 				step.version,
						_version: 				parseVersion(step.version),
						_validateResult: 		false, // to be set later
						_rank: 					rank++,
						chunk: 					chunk
					}))
				})

				// Find all studios that supports this showStyle
				StudioInstallations.find({
					supportedShowStyleBase: showStyleBase._id
				}).forEach((studio) => {
					if (!studioIds[studio._id]) { // only run once per blueprint and studio
						studioIds[studio._id] = true

						let chunk: MigrationChunk = {
							sourceType:				MigrationStepType.STUDIO,
							sourceName:				'Blueprint ' + blueprint.name + ' for studio ' + studio.name,
							blueprintId: 			blueprint._id,
							sourceId: 				studio._id,
							_dbVersion: 			parseVersion(blueprint.databaseVersion.studio[studio._id] || '0.0.0').toString(),
							_targetVersion: 		parseVersion(bp.blueprintVersion).toString(),
							_steps:					[]
						}
						migrationChunks.push(chunk)
						// Add studio migration steps from blueprint:
						_.each(bp.studioMigrations, (step) => {
							allMigrationSteps.push(prefixIdsOnStep('blueprint_' + blueprint._id + '_studio_' + studio._id + '_', {
								id:						step.id,
								overrideSteps:			step.overrideSteps,
								validate:				step.validate,
								canBeRunAutomatically:	step.canBeRunAutomatically,
								migrate:				step.migrate,
								input:					step.input,
								dependOnResultFrom:		step.dependOnResultFrom,
								version: 				step.version,
								_version: 				parseVersion(step.version),
								_validateResult: 		false, // to be set later
								_rank: 					rank++,
								chunk: 					chunk
							}))
						})
					}
				})
			})
		}
	})

	// Sort, smallest version first:
	allMigrationSteps.sort((a, b) => {
		let i = compareVersions(a._version, b._version)
		if (i !== 0) return i
		// Keep ranking within version:
		if (a._rank > b._rank) return 1
		if (a._rank < b._rank) return -1
		return 0
	})

	// console.log('allMigrationSteps', allMigrationSteps)

	let automaticStepCount: number = 0
	let manualStepCount: number = 0
	let ignoredStepCount: number = 0

	let partialMigration: boolean = false

	// Filter steps:
	let overrideIds: {[id: string]: true} = {}
	let migrationSteps: {[id: string]: MigrationStepInternal} = {}
	let ignoredSteps: {[id: string]: true} = {}
	_.each(allMigrationSteps, (step: MigrationStepInternal) => {
		if (!step.canBeRunAutomatically && (!step.input || (_.isArray(step.input) && !step.input.length))) throw new Meteor.Error(500, `MigrationStep "${step.id}" is manual, but no input is provided`)

		if (partialMigration) return
		if (
			compareVersions(step._version, parseVersion(step.chunk._dbVersion)) > 0 && // step version is larger than database version
			compareVersions(step._version, parseVersion(step.chunk._targetVersion)) <= 0 // // step version is less than (or equal) to system version
		) {
			// Step is in play

			if (step.overrideSteps) {
				// Override / delete other steps
				_.each(step.overrideSteps, (overrideId: string) => {
					delete migrationSteps[overrideId]
					if (ignoredSteps[overrideId]) {
						delete ignoredSteps[overrideId]
						ignoredStepCount--
					}
				})
			}

			if (migrationSteps[step.id] || ignoredSteps[step.id]) throw new Meteor.Error(500, `Error: MigrationStep.id must be unique: "${step.id}"`)

			// Check if the step can be applied:
			if (step.chunk.sourceType === MigrationStepType.CORE) {
				let validate = step.validate as ValidateFunctionCore
				step._validateResult = validate(false)
			} else if (step.chunk.sourceType === MigrationStepType.STUDIO) {
				let validate = step.validate as ValidateFunctionStudio
				step._validateResult = validate(getMigrationStudioContext(step.chunk), false)
			} else if (step.chunk.sourceType === MigrationStepType.SHOWSTYLE) {
				let validate = step.validate as ValidateFunctionShowStyle
				step._validateResult = validate(getMigrationShowStyleContext(step.chunk),false)
			} else throw new Meteor.Error(500, `Unknown step.chunk.sourceType "${step.chunk.sourceType}"`)

			if (step._validateResult) {
				if (step.dependOnResultFrom) {
					if (ignoredSteps[step.dependOnResultFrom]) {
						// dependent step was ignored, continue then
					} else if (migrationSteps[step.dependOnResultFrom]) {
						// we gotta pause here
						partialMigration = true
						return
					}
				}

				migrationSteps[step.id] = step
			} else {
				// No need to run step
				ignoredSteps[step.id] = true
				ignoredStepCount++
			}
		} else {
			// Step is not applicable
		}
	})

	// console.log('migrationSteps', migrationSteps)

	// check if there are any manual steps:
	// (this makes an automatic migration impossible)

	let manualInputs: Array<MigrationStepInput> = []
	let stepsHash: Array<string> = []
	_.each(migrationSteps, (step: MigrationStepInternal, id: string) => {
		stepsHash.push(step.id)
		step.chunk._steps.push(step.id)
		if (!step.canBeRunAutomatically) {
			manualStepCount++

			if (step.input) {
				let input: Array<MigrationStepInput> = []
				if (_.isArray(step.input)) {
					input = []
					_.each(step.input, (i) => {
						input.push(_.clone(i))
					})
				} else if (_.isFunction(step.input)) {

					if (step.chunk.sourceType === MigrationStepType.CORE) {
						let inputFunction = step.input as InputFunctionCore
						input = inputFunction()
					} else if (step.chunk.sourceType === MigrationStepType.STUDIO) {
						let inputFunction = step.input as InputFunctionStudio
						input = inputFunction(getMigrationStudioContext(step.chunk))
					} else if (step.chunk.sourceType === MigrationStepType.SHOWSTYLE) {
						let inputFunction = step.input as InputFunctionShowStyle
						input = inputFunction(getMigrationShowStyleContext(step.chunk))
					} else throw new Meteor.Error(500, `Unknown step.chunk.sourceType "${step.chunk.sourceType}"`)
				}
				if (input.length) {
					_.each(input, (i) => {

						if (i.label && _.isString(step._validateResult)) {
							i.label = (i.label + '').replace(/\$validation/g, step._validateResult)
						}
						if (i.description && _.isString(step._validateResult)) {
							i.description = (i.description + '').replace(/\$validation/g, step._validateResult)
						}
						manualInputs.push(_.extend({}, i, {
							stepId: step.id
						}))
					})
				}
			}
		} else {
			automaticStepCount++
		}
	})

	// Only return the chunks which has steps in them:
	let activeChunks = (
		returnAllChunks ?
		migrationChunks :
		_.filter(migrationChunks, (chunk) => {
			return chunk._steps.length > 0
		})
	)

	let hash = getHash(stepsHash.join(','))

	return {
		hash:				hash,
		chunks: 			activeChunks,
		steps: 				_.values(migrationSteps),
		automaticStepCount: automaticStepCount,
		manualStepCount: 	manualStepCount,
		ignoredStepCount: 	ignoredStepCount,
		manualInputs: 		manualInputs,
		partialMigration: 	partialMigration
	}
}
function prefixIdsOnStep (prefix: string, step: MigrationStepInternal): MigrationStepInternal {
	step.id = prefix + step.id
	if (step.overrideSteps) {
		step.overrideSteps = _.map(step.overrideSteps, (override) => {
			return prefix + override
		})
	}
	return step
}

export function runMigration (
	chunks: Array<MigrationChunk>,
	hash: string,
	inputResults: Array<MigrationStepInputResult>
): RunMigrationResult {

	logger.info(`Migration: Starting`)
	// logger.info(`Migration: Starting, from "${baseVersion.toString()}" to "${targetVersion.toString()}".`)

	// Verify the input:
	let migration = prepareMigration()

	let manualInputsWithUserPrompt = _.filter(migration.manualInputs, (manualInput) => {
		return !!(manualInput.stepId && manualInput.attribute)
	})
	if (migration.hash !== hash) throw new Meteor.Error(500, `Migration input hash differ from expected: "${hash}", "${migration.hash}"`)
	if (manualInputsWithUserPrompt.length !== inputResults.length ) throw new Meteor.Error(500, `Migration manualInput lengths differ from expected: "${inputResults.length}", "${migration.manualInputs.length}"`)

	console.log('migration.chunks', migration.chunks)
	console.log('chunks', chunks)
	// Check that chunks match:
	let unmatchedChunk = _.find(migration.chunks, (migrationChunk) => {
		return !_.find(chunks, (chunk) => {
			return _.isEqual(_.omit(chunk, ['_steps']), _.omit(migrationChunk, ['_steps']))
		})
	})
	if (unmatchedChunk) throw new Meteor.Error(500, `Migration input chunks differ from expected, chunk "${JSON.stringify(unmatchedChunk)}" not found in input`)
	unmatchedChunk = _.find(chunks, (chunk) => {
		return !_.find(migration.chunks, (migrationChunk) => {
			return _.isEqual(_.omit(chunk, ['_steps']), _.omit(migrationChunk, ['_steps']))
		})
	})
	if (unmatchedChunk) throw new Meteor.Error(500, `Migration input chunks differ from expected, chunk in input "${JSON.stringify(unmatchedChunk)}" not found in migration.chunks`)
	if (migration.chunks.length !== chunks.length) throw new Meteor.Error(500, `Migration input chunk lengths differ`)

	_.each(migration.chunks, (chunk) => {
		logger.info(`Migration: Chunk: ${chunk.sourceType}, ${chunk.sourceName}, from ${chunk._dbVersion} to ${chunk._targetVersion}`)
	})

	let warningMessages: Array<string> = []
	// First, take a system snapshot:
	let system = getCoreSystem()
	let snapshotId: string = ''
	if (system && system.storePath) {
		try {
			snapshotId = storeSystemSnapshot(null, `Automatic, taken before migration`)
		} catch (e) {
			warningMessages.push(`Error when taking snapshot:${e.toString()}`)
			logger.error(e)
		}
	}

	logger.info(`Migration: ${migration.automaticStepCount} automatic and ${migration.manualStepCount} manual steps (${migration.ignoredStepCount} ignored).`)

	logger.debug(inputResults)

	_.each(migration.steps, (step: MigrationStepInternal) => {

		try {
			// Prepare input from user
			let stepInput: MigrationStepInputFilteredResult = {}
			_.each(inputResults, (ir) => {
				if (ir.stepId === step.id) {
					stepInput[ir.attribute] = ir.value
				}
			})

			// Run the migration script

			if (step.chunk.sourceType === MigrationStepType.CORE) {
				let migration = step.migrate as MigrateFunctionCore
				migration(stepInput)
			} else if (step.chunk.sourceType === MigrationStepType.STUDIO) {
				let migration = step.migrate as MigrateFunctionStudio
				migration(getMigrationStudioContext(step.chunk), stepInput)
			} else if (step.chunk.sourceType === MigrationStepType.SHOWSTYLE) {
				let migration = step.migrate as MigrateFunctionShowStyle
				migration(getMigrationShowStyleContext(step.chunk), stepInput)
			} else throw new Meteor.Error(500, `Unknown step.chunk.sourceType "${step.chunk.sourceType}"`)

			let migrate = step.migrate as MigrateFunctionCore
			if (migrate) {
				migrate(stepInput)
			}

			// After migration, run the validation again
			// Since the migration should be done by now, the validate should return true

			let validateMessage: string | boolean = false

			if (step.chunk.sourceType === MigrationStepType.CORE) {
				let validate = step.validate as ValidateFunctionCore
				validateMessage = validate(true)
			} else if (step.chunk.sourceType === MigrationStepType.STUDIO) {
				let validate = step.validate as ValidateFunctionStudio
				validateMessage = validate(getMigrationStudioContext(step.chunk), true)
			} else if (step.chunk.sourceType === MigrationStepType.SHOWSTYLE) {
				let validate = step.validate as ValidateFunctionShowStyle
				validateMessage = validate(getMigrationShowStyleContext(step.chunk),true)
			} else throw new Meteor.Error(500, `Unknown step.chunk.sourceType "${step.chunk.sourceType}"`)

			// let validate = step.validate as ValidateFunctionCore
			// let validateMessage: string | boolean = validate(true)
			if (validateMessage) {
				// Something's not right
				let msg = `Step "${step.id}": Something went wrong, validation didn't approve of the changes. The changes have been applied, but might need to be confirmed.`
				if (validateMessage !== true && _.isString(validateMessage)) {
					msg += ` (Validation error: ${validateMessage})`
				}
				warningMessages.push(msg)
			}
		} catch (e) {
			logger.error(`Error in Migration step ${step.id}: ${e}`)
			logger.error(e.stack ? e.stack : e.toString())
			warningMessages.push(`Internal server error in step ${step.id}`)
		}
	})

	let migrationCompleted: boolean = false

	if (!migration.partialMigration) {
		if (!warningMessages.length) {
			// if there are no warning messages, we can complete the migration right away:
			logger.info(`Migration: Completing...`)
			completeMigration(migration.chunks)
			migrationCompleted = true
		}
	}

	_.each(warningMessages, (str) => {
		logger.warn(`Migration: ${str}`)
	})
	logger.info(`Migration: End`)
	return {
		migrationCompleted: migrationCompleted,
		partialMigration: migration.partialMigration,
		warnings: warningMessages,
		snapshot: snapshotId
	}
}
function completeMigration (chunks: Array<MigrationChunk>) {
	_.each(chunks, (chunk) => {
		if (chunk.sourceType === MigrationStepType.CORE) {
			setCoreSystemVersion(chunk._targetVersion.toString())
		} else if (
			chunk.sourceType === MigrationStepType.STUDIO ||
			chunk.sourceType === MigrationStepType.SHOWSTYLE
		) {

			if (!chunk.blueprintId) throw new Meteor.Error(500, `chunk.blueprintId missing!`)
			if (!chunk.sourceId) throw new Meteor.Error(500, `chunk.sourceId missing!`)

			let blueprint = Blueprints.findOne(chunk.blueprintId)
			if (!blueprint) throw new Meteor.Error(404, `Blueprint "${chunk.blueprintId}" not found!`)

			let m: any = {}
			if (chunk.sourceType === MigrationStepType.STUDIO) {
				logger.info(`Updating Blueprint "${chunk.sourceName}" version, from "${blueprint.databaseVersion.studio[chunk.sourceId]}" to "${chunk._targetVersion.toString()}".`)
				m[`databaseVersion.studio.${chunk.sourceId}`] = chunk._targetVersion.toString()

			} else if (chunk.sourceType === MigrationStepType.SHOWSTYLE) {
				logger.info(`Updating Blueprint "${chunk.sourceName}" version, from "${blueprint.databaseVersion.showStyle[chunk.sourceId]}" to "${chunk._targetVersion.toString()}".`)
				m[`databaseVersion.showStyle.${chunk.sourceId}`] = chunk._targetVersion.toString()

			} else throw new Meteor.Error(500, `Bad chunk.sourcetype: "${chunk.sourceType}"`)

			Blueprints.update(chunk.blueprintId, {$set: m})
		} else throw new Meteor.Error(500, `Unknown chunk.sourcetype: "${chunk.sourceType}"`)
	})
}
export function updateDatabaseVersion (targetVersionStr: string) {
	let targetVersion = parseVersion(targetVersionStr)
	setCoreSystemVersion(targetVersion.toString())
}

export function updateDatabaseVersionToSystem () {
	updateDatabaseVersion(CURRENT_SYSTEM_VERSION)
}

function getMigrationStatus (): GetMigrationStatusResult {

	let migration = prepareMigration(true)

	return {
		// databaseVersion:	 		databaseVersion.toString(),
		// databasePreviousVersion:	system.previousVersion,
		// systemVersion:		 		systemVersion.toString(),
		migrationNeeded:	 			migration.steps.length > 0,

		migration: {
			canDoAutomaticMigration:	migration.manualStepCount === 0,

			manualInputs:				migration.manualInputs,
			hash:						migration.hash,
			chunks:						migration.chunks,

			automaticStepCount: 		migration.automaticStepCount,
			manualStepCount: 			migration.manualStepCount,
			ignoredStepCount: 			migration.ignoredStepCount,
			partialMigration: 			migration.partialMigration
		}
	}

}
function forceMigration (chunks: Array<MigrationChunk>) {
	logger.info(`Force migration`)

	_.each(chunks, (chunk) => {
		logger.info(`Force migration: Chunk: ${chunk.sourceType}, ${chunk.sourceName}, from ${chunk._dbVersion} to ${chunk._targetVersion}`)
	})

	return completeMigration(chunks)
}
function resetDatabaseVersions () {
	updateDatabaseVersion(GENESIS_SYSTEM_VERSION)

	Blueprints.find().forEach((blueprint) => {
		Blueprints.update(blueprint._id, {$set: {
			databaseVersion: {
				studio: {},
				showStyle: {}
			}
		}})
	})
}

function getMigrationStudioContext (chunk: MigrationChunk): MigrationContextStudio {

	if (chunk.sourceType !== MigrationStepType.STUDIO) throw new Meteor.Error(500, `wrong chunk.sourceType "${chunk.sourceType}", expected STUDIO`)
	if (!chunk.sourceId) throw new Meteor.Error(500, `chunk.sourceId missing` )

	let studio = StudioInstallations.findOne(chunk.sourceId) as StudioInstallation
	if (!studio) throw new Meteor.Error(404, `Studio "${chunk.sourceId}" not found`)

	return {
		getMapping: (mappingId: string): BlueprintMapping | undefined => {
			check(mappingId, String)
			let mapping = studio.mappings[mappingId]
			if (mapping) return _.clone(mapping)
		},
		insertMapping: (mappingId: string, mapping: OmitId<BlueprintMapping>): string => {
			check(mappingId, String)
			let m: any = {}
			m['mappings.' + mappingId] = mapping
			StudioInstallations.update(studio._id, {$set: m})
			studio.mappings[mappingId] = m['mappings.' + mappingId] // Update local
			return mappingId
		},
		updateMapping: (mappingId: string, mapping: Partial<BlueprintMapping>): void => {
			check(mappingId, String)
			let m: any = {}
			m['mappings.' + mappingId] = _.extend(studio.mappings[mappingId], mapping)
			StudioInstallations.update(studio._id, {$set: m})
			studio.mappings[mappingId] = m['mappings.' + mappingId] // Update local
		},
		removeMapping: (mappingId: string): void => {
			check(mappingId, String)
			let m: any = {}
			m['mappings.' + mappingId] = 1
			StudioInstallations.update(studio._id, {$unset: m})
			delete studio.mappings[mappingId] // Update local
		},
		getConfig: (configId: string): ConfigItemValue | undefined => {
			check(configId, String)
			let configItem = _.find(studio.config, c => c._id === configId)
			if (configItem) return configItem.value
		},
		setConfig: (configId: string, value: ConfigItemValue): void => {
			check(configId, String)

			let configItem = _.find(studio.config, c => c._id === configId)
			if (configItem) {
				StudioInstallations.update({
					_id: studio._id,
					'config._id': configId
				}, {$set: {
					'config.$.value' : value
				}})
				configItem.value = value // Update local
			} else {
				let config: IConfigItem = {
					_id: configId,
					value: value
				}
				StudioInstallations.update({
					_id: studio._id,
				}, {$push: {
					config : config
				}})
				studio.config.push(config) // Update local
			}
		},
		removeConfig: (configId: string): void => {
			check(configId, String)

			StudioInstallations.update({
				_id: studio._id,
			}, {$pull: {
				'config': {
					_id: configId
				}
			}})
			// Update local:
			studio.config = _.reject(studio.config, c => c._id === configId)
		}
	}
}
function getMigrationShowStyleContext (chunk: MigrationChunk): MigrationContextShowStyle {
	if (chunk.sourceType !== MigrationStepType.SHOWSTYLE) throw new Meteor.Error(500, `wrong chunk.sourceType "${chunk.sourceType}", expected SHOWSTYLE`)
	if (!chunk.sourceId) throw new Meteor.Error(500, `chunk.sourceId missing` )

	let showStyleBase = ShowStyleBases.findOne(chunk.sourceId) as ShowStyleBase
	if (!showStyleBase) throw new Meteor.Error(404, `ShowStyleBase "${chunk.sourceId}" not found`)

	return {
		getAllVariants: (): IBlueprintShowStyleVariant[] => {
			return ShowStyleVariants.find({
				showStyleBaseId: showStyleBase._id
			}).fetch()
		},
		getVariant: (variantId: string): IBlueprintShowStyleVariant | undefined => {
			check(variantId, String)
			return ShowStyleVariants.findOne({
				showStyleBaseId: showStyleBase._id,
				_id: variantId
			})
		},
		insertVariant: (variantPart: OmitId<ShowStyleVariantPart>): string => {

			let variant = {
				_id: Random.id(),
				showStyleBaseId: showStyleBase._id,
				name: variantPart.name,
				config: []
			}
			return ShowStyleVariants.insert(variant)
		},
		updateVariant: (variantId: string, variant: Partial<ShowStyleVariantPart>): void => {
			check(variantId, String)
			ShowStyleVariants.update({
				_id: variantId,
				showStyleBaseId: showStyleBase._id,
			}, {$set: variant})
		},
		removeVariant: (variantId: string): void => {
			check(variantId, String)
			ShowStyleVariants.remove({
				_id: variantId,
				showStyleBaseId: showStyleBase._id,
			})
		},
		getSourceLayer: (sourceLayerId: string): ISourceLayer | undefined => {
			check(sourceLayerId, String)
			return _.find(showStyleBase.sourceLayers, sl => sl._id === sourceLayerId)
		},
		insertSourceLayer: (layer: ISourceLayer): string => {
			if (layer._id) {
				let oldLayer = _.find(showStyleBase.sourceLayers, sl => sl._id === layer._id)
				if (oldLayer) throw new Meteor.Error(500, `Can't insert SourceLayer, _id "${layer._id}" already exists!`)
			}

			let sl: ISourceLayer = _.extend(layer, {
				_id: layer._id || Random.id()
			})
			ShowStyleBases.update({
				_id: showStyleBase._id,
			}, {$push: {
				sourceLayers: sl
			}})
			showStyleBase.sourceLayers.push(sl) // Update local
			return sl._id
		},
		updateSourceLayer: (sourceLayerId: string, layer: Partial<ISourceLayer>): void => {
			check(sourceLayerId, String)
			let sl = _.find(showStyleBase.sourceLayers, sl => sl._id === sourceLayerId) as ISourceLayer
			if (!sl) throw new Meteor.Error(404, `SourceLayer "${sourceLayerId}" not found`)

			_.each(layer, (value, key) => {
				sl[key] = value // Update local
			})
			ShowStyleBases.update({
				_id: showStyleBase._id,
				'sourceLayers._id': sourceLayerId
			}, {$set: {
				'sourceLayers.$' : sl
			}})

		},
		removeSourceLayer: (sourceLayerId: string): void => {
			check(sourceLayerId, String)

			ShowStyleBases.update({
				_id: showStyleBase._id,
			}, {$pull: {
				'sourceLayers': {
					_id: sourceLayerId
				}
			}})
			// Update local:
			showStyleBase.sourceLayers = _.reject(showStyleBase.sourceLayers, c => c._id === sourceLayerId)
		},
		getOutputLayer: (outputLayerId: string): IOutputLayer | undefined => {
			check(outputLayerId, String)
			return _.find(showStyleBase.outputLayers, sl => sl._id === outputLayerId)
		},
		insertOutputLayer: (layer: IOutputLayer): string => {
			if (layer._id) {
				let oldLayer = _.find(showStyleBase.outputLayers, sl => sl._id === layer._id)
				if (oldLayer) throw new Meteor.Error(500, `Can't insert OutputLayer, _id "${layer._id}" already exists!`)
			}

			let sl: IOutputLayer = _.extend(layer, {
				_id: layer._id || Random.id()
			})
			ShowStyleBases.update({
				_id: showStyleBase._id,
			}, {$push: {
				outputLayers: sl
			}})
			showStyleBase.outputLayers.push(sl) // Update local
			return sl._id
		},
		updateOutputLayer: (outputLayerId: string, layer: Partial<IOutputLayer>): void => {
			check(outputLayerId, String)
			let sl = _.find(showStyleBase.outputLayers, sl => sl._id === outputLayerId) as IOutputLayer
			if (!sl) throw new Meteor.Error(404, `OutputLayer "${outputLayerId}" not found`)

			_.each(layer, (value, key) => {
				sl[key] = value // Update local
			})
			ShowStyleBases.update({
				_id: showStyleBase._id,
				'outputLayers._id': outputLayerId
			}, {$set: {
				'outputLayers.$' : sl
			}})
		},
		removeOutputLayer: (outputLayerId: string): void => {
			check(outputLayerId, String)
			ShowStyleBases.update({
				_id: showStyleBase._id,
			}, {$pull: {
				'outputLayers': {
					_id: outputLayerId
				}
			}})
			// Update local:
			showStyleBase.outputLayers = _.reject(showStyleBase.outputLayers, c => c._id === outputLayerId)
		},
		getBaseConfig: (configId: string): ConfigItemValue | undefined => {
			check(configId, String)
			let configItem = _.find(showStyleBase.config, c => c._id === configId)
			if (configItem) return configItem.value
		},
		setBaseConfig: (configId: string, value: ConfigItemValue): void => {
			check(configId, String)
			if (_.isUndefined(value)) throw new Meteor.Error(400, `setBaseConfig "${configId}": value is undefined`)

			let configItem = _.find(showStyleBase.config, c => c._id === configId)
			if (configItem) {
				ShowStyleBases.update({
					_id: showStyleBase._id,
					'config._id': configId
				}, {$set: {
					'config.$.value' : value
				}})
				configItem.value = value // Update local
			} else {
				let config: IConfigItem = {
					_id: configId,
					value: value
				}
				ShowStyleBases.update({
					_id: showStyleBase._id,
				}, {$push: {
					config : config
				}})
				showStyleBase.config.push(config) // Update local
			}
		},
		removeBaseConfig: (configId: string): void => {
			check(configId, String)
			ShowStyleBases.update({
				_id: showStyleBase._id,
			}, {$pull: {
				'config': {
					_id: configId
				}
			}})
			// Update local:
			showStyleBase.config = _.reject(showStyleBase.config, c => c._id === configId)
		},
		getVariantConfig: (variantId: string, configId: string): ConfigItemValue | undefined => {
			check(variantId, String)
			check(configId, String)

			let variant = ShowStyleVariants.findOne({
				_id: variantId,
				showStyleBaseId: showStyleBase._id
			}) as ShowStyleVariant
			if (!variant) throw new Meteor.Error(404, `ShowStyleVariant "${variantId}" not found`)

			let configItem = _.find(variant.config, c => c._id === configId)
			if (configItem) return configItem.value
		},
		setVariantConfig: (variantId: string, configId: string, value: ConfigItemValue): void => {
			check(variantId, String)
			check(configId, String)

			if (_.isUndefined(value)) throw new Meteor.Error(400, `setVariantConfig "${variantId}", "${configId}": value is undefined`)

			console.log('setVariantConfig', variantId, configId, value)

			let variant = ShowStyleVariants.findOne({
				_id: variantId,
				showStyleBaseId: showStyleBase._id
			}) as ShowStyleVariant
			if (!variant) throw new Meteor.Error(404, `ShowStyleVariant "${variantId}" not found`)

			let configItem = _.find(variant.config, c => c._id === configId)
			if (configItem) {
				ShowStyleVariants.update({
					_id: variant._id,
					'config._id': configId
				}, {$set: {
					'config.$.value' : value
				}})
				configItem.value = value // Update local
			} else {
				let config: IConfigItem = {
					_id: configId,
					value: value
				}
				ShowStyleVariants.update({
					_id: variant._id,
				}, {$push: {
					config : config
				}})
				variant.config.push(config) // Update local
			}
		},
		removeVariantConfig: (variantId: string, configId: string): void => {
			check(variantId, String)
			check(configId, String)

			let variant = ShowStyleVariants.findOne({
				_id: variantId,
				showStyleBaseId: showStyleBase._id
			}) as ShowStyleVariant
			if (!variant) throw new Meteor.Error(404, `ShowStyleVariant "${variantId}" not found`)

			ShowStyleVariants.update({
				_id: variant._id,
			}, {$pull: {
				'config': {
					_id: configId
				}
			}})
			// Update local:
			showStyleBase.config = _.reject(showStyleBase.config, c => c._id === configId)
		}
	}
}

let methods = {}
methods[MigrationMethods.getMigrationStatus] = getMigrationStatus
methods[MigrationMethods.runMigration] = runMigration
methods[MigrationMethods.forceMigration] = forceMigration
methods[MigrationMethods.resetDatabaseVersions] = resetDatabaseVersions
methods['debug_setVersion'] = (version: string) => {
	return updateDatabaseVersion (version)
}

setMeteorMethods(methods)
