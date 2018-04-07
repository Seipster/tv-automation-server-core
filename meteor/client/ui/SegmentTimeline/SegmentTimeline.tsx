import { Meteor } from 'meteor/meteor'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

import * as ClassNames from 'classnames'
import Moment from 'react-moment'
import * as _ from 'underscore'

import { Segment, Segments } from '../../../lib/collections/Segments'
import { SegmentLine, SegmentLines } from '../../../lib/collections/SegmentLines'
import { SegmentLineItem, SegmentLineItems } from '../../../lib/collections/SegmentLineItems'
import { StudioInstallation, StudioInstallations } from '../../../lib/collections/StudioInstallations'
import { SegmentUi, SegmentLineUi, IOutputLayerUi, ISourceLayerUi, SegmentLineItemUi } from './SegmentTimelineContainer'

interface ISourceLayerItemProps {
	layer: ISourceLayerUi
	outputLayer: IOutputLayerUi
	segment: SegmentUi
	segmentLine: SegmentLineUi
	segmentLineItem: SegmentLineItemUi
	timeScale: number
}
class SourceLayerItem extends React.Component<ISourceLayerItemProps> {
	getItemStyle (): { [key: string]: string } {
		let segmentLineItem = this.props.segmentLineItem

		return {
			'width': (segmentLineItem.expectedDuration * this.props.timeScale).toString() + 'px'
		}
	}

	render () {
		return (
			<div className='segment-timeline__layer-item' style={this.getItemStyle()}>
				<span className='segment-timeline__layer-item__label'>{this.props.segmentLineItem.name}</span>
			</div>
		)
	}
}

interface ISourceLayerProps {
	layer: ISourceLayerUi
	outputLayer: IOutputLayerUi
	segment: SegmentUi
	segmentLine: SegmentLineUi
	timeScale: number
}
class SourceLayer extends React.Component<ISourceLayerProps> {
	getLayerStyle () {
		return {
			// TODO: Use actual segment line duration, instead of the max(items.duration) one
			width: ((this.props.segmentLine.items !== undefined && _.max(this.props.segmentLine.items!.map((item) => {
				return item.duration || item.expectedDuration
			}))) || 0 ).toString() + 'px'
		}
	}

	renderInside () {
		console.log(this.props.layer)

		if (this.props.layer.items !== undefined) {
			return this.props.layer.items
			.filter((segmentLineItem) => {
				// filter only segment line items belonging to this segment line
				return (segmentLineItem.segmentLineId === this.props.segmentLine._id) ? true : false
			})
			.map((segmentLineItem) => {
				return (
					<SourceLayerItem key={segmentLineItem._id}
									 {...this.props}
									 segmentLineItem={segmentLineItem}
									 layer={this.props.layer}
									 outputLayer={this.props.outputLayer}
									 segment={this.props.segment}
									 segmentLine={this.props.segmentLine}
									 timeScale={this.props.timeScale} />
				)
			})
		}
	}

	render () {
		return (
			<div className='segment-timeline__layer' style={this.getLayerStyle()}>
				{this.renderInside()}
			</div>
		)
	}
}

interface IOutputGroupProps {
	layer: IOutputLayerUi
	segment: SegmentUi
	segmentLine: SegmentLineUi
	timeScale: number
	collapsedOutputs: {
		[key: string]: boolean
	}
}
class OutputGroup extends React.Component<IOutputGroupProps> {
	renderInside () {
		if (this.props.layer.sourceLayers !== undefined) {
			return this.props.layer.sourceLayers.map((sourceLayer) => {
				return <SourceLayer key={sourceLayer._id}
									{...this.props}
									layer={sourceLayer}
									outputLayer={this.props.layer}
									segment={this.props.segment}
									segmentLine={this.props.segmentLine}
									timeScale={this.props.timeScale} />
			})
		}
	}

	render () {
		return (
			<div className={ClassNames('segment-timeline__output-group', {
				'collapsable': this.props.layer.sourceLayers && this.props.layer.sourceLayers.length > 1,
				'collapsed': this.props.collapsedOutputs[this.props.layer._id] === true
			})}>
				{this.renderInside()}
			</div>
		)
	}
}

interface IPropsHeader {
	key: string
	segment: SegmentUi
	studioInstallation: StudioInstallation
	segmentLines: Array<SegmentLineUi>
	timeScale: number
	onCollapseOutputToggle?: (layer: IOutputLayerUi, event: any) => void
	collapsedOutputs: {
		[key: string]: boolean
	}
}
export class SegmentTimeline extends React.Component<IPropsHeader> {
	renderTimelineOutputGroups (segmentLine: SegmentLineUi) {
		if (this.props.segment.outputLayers !== undefined) {
			return _.map(_.filter(this.props.segment.outputLayers, (layer) => {
				return (layer.used) ? true : false
			}).sort((a, b) => {
				return a._rank - b._rank
			}), (layer, id) => {
				// Only render output layers used by the segment
				if (layer.used) {
					return (
						<OutputGroup key={layer._id}
									 {...this.props}
									 layer={layer}
									 segment={this.props.segment}
									 segmentLine={segmentLine}
									 timeScale={this.props.timeScale} />
					)
				}
			})
		}
	}

	renderTimeline () {
		return this.props.segmentLines.map((segmentLine) => {
			return (
				<div key={segmentLine._id} className='segment-timeline__segment-line'>
					{this.renderTimelineOutputGroups(segmentLine)}
				</div>
			)
		})
	}

	renderOutputLayerControls () {
		if (this.props.segment.outputLayers !== undefined) {
			return _.map(_.values(this.props.segment.outputLayers!).sort((a, b) => {
				return a._rank - b._rank
			}), (outputLayer) => {
				if (outputLayer.used) {
					return (
						<div key={outputLayer._id} className={ClassNames('segment-timeline__output-layer-control', {
							'collapsable': outputLayer.sourceLayers !== undefined && outputLayer.sourceLayers.length > 1,
							'collapsed': this.props.collapsedOutputs[outputLayer._id] === true
						})}>
							<div className='segment-timeline__output-layer-control__label'
								 onClick={(e) => this.props.onCollapseOutputToggle && this.props.onCollapseOutputToggle(outputLayer, e)}>{outputLayer.name}
							</div>
							{(
								outputLayer.sourceLayers !== undefined &&
								outputLayer.sourceLayers.sort((a, b) => {
									return a._rank - b._rank
								}).map((sourceLayer) => {
									return (
										<div key={sourceLayer._id} className='segment-timeline__output-layer-control__layer'>
											{sourceLayer.name}
										</div>
									)
								})
							)}
						</div>
					)
				}
			})
		}
	}

	render () {
		return (
			<div className='segment-timeline'>
				<h2 className='segment-timeline__title'>{this.props.segment.name}</h2>
				<div className='segment-timeline__mos-id'>{this.props.segment.mosId}</div>
				<div className='segment-timeline__output-layers'>
					{this.renderOutputLayerControls()}
				</div>
				<div className='segment-timeline__timeline'>
					{this.renderTimeline()}
				</div>
			</div>
		)
	}
}