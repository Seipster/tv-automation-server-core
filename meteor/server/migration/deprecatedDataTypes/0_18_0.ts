import { Mongo } from 'meteor/mongo'
import {
	ITestToolsConfig,
	IStudioRuntimeArgumentsItem
} from '../../../lib/collections/StudioInstallations'
import { TransformedCollection } from '../../../lib/typings/meteor'
import { LookaheadMode } from '../../../lib/api/playout'
import { ISourceLayerBase, IOutputLayerBase } from '../../../lib/collections/ShowStyleBases'

// lib/collections/ShowStyles.ts
export interface TemplateMappings {
	[key: string]: string
}
export interface ShowStyle {
	_id: string
	name: string
	/** Override studio-level source-layer properties (UI name, rank) */
	sourceLayerOverrides?: Array<ISourceLayerBase>
	/** Override studio-level output-layer properties (UI name, rank) */
	outputLayerOverrides?: Array<IOutputLayerBase>
	/** Map a template name to a runtime function? */
	templateMappings: TemplateMappings | never[]
	/** The name of the template to be run for the baseline state when the running order is activated */
	baselineTemplate: string
	/** The name of the template to be run to generate external messages upon TAKEs */
	messageTemplate: string
	/** The name of the blueprint which is used to determine which other blueprint is used to create the sl&sli for a story */
	routerBlueprint: string
	/** The name of the blueprint which is the post-process step to run on a segment after any sl has changed */
	postProcessBlueprint: string
}
export const ShowStyles: TransformedCollection<ShowStyle, ShowStyle>
	= new Mongo.Collection<ShowStyle>('showStyles')