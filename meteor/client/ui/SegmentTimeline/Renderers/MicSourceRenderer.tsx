import * as React from 'react'
import * as $ from 'jquery'

import { ISourceLayerItemProps } from '../SourceLayerItem'
import { ScriptContent } from 'tv-automation-sofie-blueprints-integration'

import { FloatingInspector } from '../../FloatingInspector'
import Moment from 'react-moment'

import { faPlay } from '@fortawesome/fontawesome-free-solid'
import * as FontAwesomeIcon from '@fortawesome/react-fontawesome'

import { CustomLayerItemRenderer } from './CustomLayerItemRenderer'

const BREAK_SCRIPT_BREAKPOINT = 620
const SCRIPT_PART_LENGTH = 250
export class MicSourceRenderer extends CustomLayerItemRenderer {

	itemPosition: number
	itemWidth: number
	itemElement: HTMLDivElement
	lineItem: JQuery<HTMLDivElement>
	linePosition: number
	leftLabel: HTMLSpanElement
	rightLabel: HTMLSpanElement

	readTime: number

	private _forceSizingRecheck: boolean

	constructor (props) {
		super(props)
	}

	repositionLine = () => {
		this.lineItem.css('left', this.linePosition + 'px')
	}

	refreshLine = () => {
		if (this.itemElement) {
			this.itemPosition = $(this.itemElement).position().left || 0
			const content = this.props.segmentLineItem.content as ScriptContent
			let scriptReadTime = 0
			if (content && content.sourceDuration) {
				scriptReadTime = content.sourceDuration * this.props.timeScale
				this.readTime = content.sourceDuration
			} else {
				scriptReadTime = $(this.itemElement).width() || 0
			}

			if (this.itemPosition + scriptReadTime !== this.linePosition) {
				this.linePosition = Math.min(this.itemPosition + scriptReadTime, this.props.segmentLineDuration * this.props.timeScale)
				this.repositionLine()
			}
		}
	}

	setLeftLabelRef = (e: HTMLSpanElement) => {
		this.leftLabel = e
	}

	setRightLabelRef = (e: HTMLSpanElement) => {
		this.rightLabel = e
	}

	componentWillReceiveProps (nextProps: ISourceLayerItemProps, nextContext: any) {
		if (super.componentWillReceiveProps && typeof super.componentWillReceiveProps === 'function') {
			super.componentWillReceiveProps(nextProps, nextContext)
		}

		if ((nextProps.segmentLineDuration !== this.props.segmentLineDuration) ||
			(nextProps.segmentLineItem.renderedInPoint !== this.props.segmentLineItem.renderedInPoint) ||
			(nextProps.segmentLineItem.renderedDuration !== this.props.segmentLineItem.renderedDuration) ||
			(nextProps.segmentLineItem.duration !== this.props.segmentLineItem.duration) ||
			(nextProps.segmentLineItem.expectedDuration !== this.props.segmentLineItem.expectedDuration) ||
			(nextProps.segmentLineItem.trigger !== this.props.segmentLineItem.trigger)) {
			this._forceSizingRecheck = true
		}
	}

	componentDidMount () {
		// Create line element
		this.lineItem = $('<div class="segment-timeline__layer-item-appendage script-line"></div>') as JQuery<HTMLDivElement>
		this.updateAnchoredElsWidths()
		if (this.props.itemElement) {
			this.itemElement = this.props.itemElement
			$(this.itemElement).parent().parent().append(this.lineItem)
			this.refreshLine()
		}
	}

	updateAnchoredElsWidths = () => {
		let leftLabelWidth = $(this.leftLabel).width() || 0
		let rightLabelWidth = $(this.rightLabel).width() || 0

		this.setAnchoredElsWidths(leftLabelWidth, rightLabelWidth)
	}

	componentDidUpdate (prevProps: Readonly<any>, prevState: Readonly<any>) {
		if (super.componentDidUpdate && typeof super.componentDidUpdate === 'function') {
			super.componentDidUpdate(prevProps, prevState)
		}

		// Move the line element
		if (this.itemElement !== this.props.itemElement) {
			if (this.itemElement) {
				this.lineItem.remove()
			}
			this.itemElement = this.props.itemElement
			$(this.itemElement).parent().parent().append(this.lineItem)
			this._forceSizingRecheck = true
		}

		const content = this.props.segmentLineItem.content as ScriptContent
		if (content.sourceDuration && content.sourceDuration !== this.readTime) {
			this._forceSizingRecheck = true
		}
		if (this._forceSizingRecheck) {
			// Update sizing information
			this._forceSizingRecheck = false

			this.refreshLine()
		}

		if (this.props.segmentLineItem.name !== prevProps.segmentLineItem.name) {
			this.updateAnchoredElsWidths()
		}
	}

	componentWillUnmount () {
		// Remove the line element
		this.lineItem.remove()
	}

	render () {
		const {t} = this.props
		let labelItems = (this.props.segmentLineItem.name || '').split('||')
		let begin = labelItems[0] || ''
		let end = labelItems[1] || ''

		function shorten (str: string, maxLen: number, separator: string = ' ') {
			if (str.length <= maxLen) return str
			return str.substr(0, str.lastIndexOf(separator, maxLen))
		}

		const content = this.props.segmentLineItem.content as ScriptContent

		const breakScript = !!(content && content.fullScript && content.fullScript.length > BREAK_SCRIPT_BREAKPOINT)

		return <React.Fragment>
			<span className='segment-timeline__layer-item__label first-words overflow-label' ref={this.setLeftLabelRef} style={this.getItemLabelOffsetLeft()}>
				{begin}
			</span>
			<span className='segment-timeline__layer-item__label right-side' ref={this.setRightLabelRef} style={this.getItemLabelOffsetRight()}>
				<span className='segment-timeline__layer-item__label last-words'>{end}</span>
				{this.renderInfiniteIcon()}
				{this.renderOverflowTimeLabel()}
			</span>
			<FloatingInspector shown={this.props.showMiniInspector && this.props.itemElement !== undefined}>
				<div className={'segment-timeline__mini-inspector ' + this.props.typeClass + ' segment-timeline__mini-inspector--pop-down'} style={this.getFloatingInspectorStyle()}>
					<div>
						{content && content.fullScript ?
							breakScript ?
								<React.Fragment>
									<span className='mini-inspector__full-text'>{shorten(content.fullScript, SCRIPT_PART_LENGTH) + '\u2026'}</span>
									<span className='mini-inspector__full-text text-end'>{shorten(content.fullScript, SCRIPT_PART_LENGTH) + '\u2026'}</span>
								</React.Fragment>
								: <span className='mini-inspector__full-text'>{content.fullScript}</span>
							: <span className='mini-inspector__system'>{t('Script is empty')}</span>
						}
					</div>
					{content && content.lastModified ?
						<div className='mini-inspector__footer'>
							<span className='mini-inspector__changed'><Moment date={content.lastModified} calendar={true} /></span>
						</div>
						: null
					}
				</div>
			</FloatingInspector>
		</React.Fragment>
	}
}
