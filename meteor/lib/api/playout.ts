export namespace PlayoutAPI {
	export enum methods {
		// 'reloadData' = 'playout.reloadData',
		// 'roReset' = 'playout.roReset',
		// 'roFastReset' = 'playout.roFastReset',
		// 'roActivate' = 'playout.roActivate',

		'roPrepareForBroadcast' = 'playout.roPrepareForBroadcast',
		'roResetRunningOrder' 	= 'playout.roResetRunningOrdert',
		'roResetAndActivate' 	= 'playout.roResetAndActivate',
		'roActivate' 			= 'playout.roActivate',
		'roDeactivate' 			= 'playout.roDeactivate',
		'reloadData' 			= 'playout.reloadData',
		/**
		 * Inactivates the RunningOrder
		 * TODO: Clear the Timeline (?)
		 */
		// 'roDeactivate' = 'playout.roDeactivate',
		/**
		 * Perform the TAKE action, i.e start playing a segmentLineItem
		 */
		'roTake' = 'playout.roTake',
		'roSetNext' = 'playout.roSetNext',
		'roMoveNext' = 'playout.roMoveNext',
		'roActivateHold' = 'playout.roActivateHold',
		'roStoriesMoved' = 'playout.roStoriesMoved',
		'roDisableNextSegmentLineItem' = 'playout.roDisableNextSegmentLineItem',
		'roToggleSegmentLineArgument' = 'playout.roToggleSegmentLineArgument',
		'segmentLinePlaybackStartedCallback' = 'playout.segmentLinePlaybackStartedCallback',
		'segmentLineItemPlaybackStartedCallback' = 'playout.segmentLineItemPlaybackStartedCallback',
		'segmentLineItemTakeNow' = 'playout.segmentLineItemTakeNow',
		'segmentAdLibLineItemStart' = 'playout.segmentAdLibLineItemStart',
		'runningOrderBaselineAdLibItemStart' = 'playout.runningOrderBaselineAdLibItemStart',
		'segmentAdLibLineItemStop' = 'playout.segmentAdLibLineItemStop',
		'sourceLayerOnLineStop' = 'playout.sourceLayerOnLineStop',
		'sourceLayerStickyItemStart' = 'playout.sourceLayerStickyItemStart',
		'timelineTriggerTimeUpdateCallback' = 'playout.timelineTriggerTimeUpdateCallback',
		'saveEvaluation' = 'playout.saveEvaluation',

		'userRoTake' = 'playout.userRoTake',
	}
}
