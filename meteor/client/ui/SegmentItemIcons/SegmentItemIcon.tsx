import { withTracker } from '../../lib/ReactMeteorData/ReactMeteorData'
import { MeteorReactComponent } from '../../lib/MeteorReactComponent'
import * as React from 'react'
import { SegmentLineItem, SegmentLineItems } from '../../../lib/collections/SegmentLineItems'
import { SourceLayerType, ISourceLayer } from 'tv-automation-sofie-blueprints-integration'
import { normalizeArray } from '../../../lib/lib'
import * as _ from 'underscore'

import CamInputIcon from './Renderers/CamInput'
import VTInputIcon from './Renderers/VTInput'
import SplitInputIcon from './Renderers/SplitInput'
import RemoteInputIcon from './Renderers/RemoteInput'
import LiveSpeakInputIcon from './Renderers/LiveSpeakInput'
import GraphicsInputIcon from './Renderers/GraphicsInput'
import { Meteor } from 'meteor/meteor'
import { ShowStyleBases } from '../../../lib/collections/ShowStyleBases'

interface IPropsHeader {
	segmentItemId: string
	runningOrderId: string
	showStyleBaseId: string
}

interface INamePropsHeader extends IPropsHeader {
	segmentLineSlug: string
}

export const SegmentItemNameContainer = withTracker((props: INamePropsHeader) => {
	let items = SegmentLineItems.find({ segmentLineId: props.segmentItemId }).fetch()

	let showStyleBase = ShowStyleBases.findOne(props.showStyleBaseId)

	let sourceLayers = showStyleBase ? normalizeArray<ISourceLayer>(showStyleBase.sourceLayers.map((layer) => { return _.clone(layer) }), '_id') : {}
	let sourceLayer: ISourceLayer | undefined
	let segmentLineItem: SegmentLineItem | undefined
	const supportedLayers = new Set([SourceLayerType.GRAPHICS, SourceLayerType.LIVE_SPEAK, SourceLayerType.VT ])

	for (const item of items) {
		let layer = sourceLayers[item.sourceLayerId]
		if (!layer) continue
		if (typeof sourceLayer !== 'undefined' && typeof segmentLineItem !== 'undefined') {
			if (layer.onPresenterScreen && sourceLayer._rank >= layer._rank && supportedLayers.has(layer.type)) {
				sourceLayer = layer
				if (segmentLineItem.trigger && item.trigger && item.trigger.value > segmentLineItem.trigger.value) {
					segmentLineItem = item
				}
			}
		} else if (layer.onPresenterScreen && supportedLayers.has(layer.type)) {
			sourceLayer = layer
			segmentLineItem = item
		}
	}

	return {
		sourceLayer,
		segmentLineItem
	}
})(class extends MeteorReactComponent<INamePropsHeader & { sourceLayer: ISourceLayer, segmentLineItem: SegmentLineItem }> {
	_segmentLineItemSubscription: Meteor.SubscriptionHandle

	componentWillMount () {
		this.subscribe('segmentLineItemsSimple', {
			runningOrderId: this.props.runningOrderId
		})
		this.subscribe('showStyleBases', {
			_id: this.props.showStyleBaseId
		})
	}

	render () {
		if (this.props.sourceLayer) {
			switch (this.props.sourceLayer.type) {
				case SourceLayerType.GRAPHICS:
				case SourceLayerType.LIVE_SPEAK:
				case SourceLayerType.VT:
					return this.props.segmentLineItem.name
			}
		}
		return this.props.segmentLineSlug.split(';')[1] || ''
	}
})

export const SegmentItemIconContainer = withTracker((props: IPropsHeader) => {
	// console.log(props)
	let items = SegmentLineItems.find({ segmentLineId: props.segmentItemId }).fetch()
	let showStyleBase = ShowStyleBases.findOne(props.showStyleBaseId)

	let sourceLayers = showStyleBase ? normalizeArray<ISourceLayer>(showStyleBase.sourceLayers.map((layer) => { return _.clone(layer) }), '_id') : {}
	let sourceLayer: ISourceLayer | undefined
	let segmentLineItem: SegmentLineItem | undefined
	const supportedLayers = new Set([ SourceLayerType.GRAPHICS, SourceLayerType.LIVE_SPEAK, SourceLayerType.REMOTE, SourceLayerType.SPLITS, SourceLayerType.VT, SourceLayerType.CAMERA ])

	for (const item of items) {
		let layer = sourceLayers[item.sourceLayerId]
		if (!layer) continue
		if (typeof sourceLayer !== 'undefined' && typeof segmentLineItem !== 'undefined') {
			if (layer.onPresenterScreen && sourceLayer._rank >= layer._rank && supportedLayers.has(layer.type)) {
				sourceLayer = layer
				if (segmentLineItem.trigger && item.trigger && item.trigger.value > segmentLineItem.trigger.value) {
					segmentLineItem = item
				}
			}
		} else if (layer.onPresenterScreen && supportedLayers.has(layer.type)) {
			sourceLayer = layer
			segmentLineItem = item
		}
	}

	return {
		sourceLayer,
		segmentLineItem
	}
})(class extends MeteorReactComponent<IPropsHeader & { sourceLayer: ISourceLayer, segmentLineItem: SegmentLineItem }> {
	_segmentLineItemSubscription: Meteor.SubscriptionHandle

	componentWillMount () {
		this.subscribe('segmentLineItemsSimple', {
			runningOrderId: this.props.runningOrderId
		})
		this.subscribe('showStyleBases', {
			_id: this.props.showStyleBaseId
		})
	}

	render () {
		if (this.props.sourceLayer) {
			switch (this.props.sourceLayer.type) {
				case SourceLayerType.GRAPHICS :
					return (
						<GraphicsInputIcon abbreviation={this.props.sourceLayer.abbreviation} />
					)
				case SourceLayerType.LIVE_SPEAK :
					return (
						<LiveSpeakInputIcon abbreviation={this.props.sourceLayer.abbreviation} />
					)
				case SourceLayerType.REMOTE :
					return (
						<RemoteInputIcon inputIndex={ parseInt(((this.props.segmentLineItem || {}).name.toString()).split(' ').slice(-1)[0], 10) as number } abbreviation={this.props.sourceLayer.abbreviation} />
					)
				case SourceLayerType.SPLITS :
					return (
						<SplitInputIcon abbreviation={this.props.sourceLayer.abbreviation} segmentLineItem={this.props.segmentLineItem} />
					)
				case SourceLayerType.VT :
					return (
						<VTInputIcon abbreviation={this.props.sourceLayer.abbreviation} />
					)
				case SourceLayerType.CAMERA :
					return (
						<CamInputIcon inputIndex={ parseInt(((this.props.segmentLineItem || {}).name.toString()).split(' ').slice(-1)[0], 10) as number } abbreviation={this.props.sourceLayer.abbreviation} />
					)
			}
		}
		return null
	}
})
