import { Meteor } from 'meteor/meteor'
import { SegmentLineItemUi, SegmentLineUi } from '../ui/SegmentTimeline/SegmentTimelineContainer'
import * as _ from 'underscore'
import * as Timecode from 'smpte-timecode'
import { Settings } from '../../lib/Settings'

export namespace RundownUtils {
	export function getSegmentDuration (lines: Array<SegmentLineUi>) {
		return lines.reduce((memo, item) => {
			return memo + (item.duration || item.renderedDuration || item.expectedDuration || 0)
		}, 0)
	}

	export function formatTimeToTimecode (seconds: number): string {
		return (new Timecode(seconds * Settings['frameRate'], Settings['frameRate'], false)).toString()
	}

	export function formatDiffToTimecode (seconds: number, showPlus?: boolean): string {
		function padZero (input: number): string {
			if (input < 10) {
				return '0' + input.toString(10)
			} else {
				return input.toString(10)
			}
		}

		const isNegative = seconds < 0
		if (isNegative) {
			seconds = seconds * -1
		}

		const minutes = Math.floor(seconds / 60)
		const secondsRest = Math.floor(seconds % 60)

		return (isNegative ? '-' : (showPlus && seconds > 0 ? '+' : '')) + padZero(minutes) + ':' + padZero(secondsRest)
	}

	export function isInsideViewport (scrollLeft: number, scrollWidth: number, segmentLine: SegmentLineUi, segmentLineItem?: SegmentLineItemUi) {
		if (scrollLeft + scrollWidth < (segmentLine.startsAt || 0) + (segmentLineItem !== undefined ? (segmentLineItem.renderedInPoint || 0) : 0)) {
			return false
		} else if (scrollLeft > (segmentLine.startsAt || 0) + (segmentLineItem !== undefined ? (segmentLineItem.renderedInPoint || 0) + (segmentLineItem.renderedDuration || 0) : (segmentLine.renderedDuration || 0))) {
			return false
		}
		return true
	}
}
