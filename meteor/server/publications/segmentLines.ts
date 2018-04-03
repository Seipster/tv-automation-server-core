import { Meteor } from 'meteor/meteor'

import { RunningOrderSecurity } from '../security/runningOrders'
import { SegmentLines } from '../../lib/collections/SegmentLines'

Meteor.publish('segmentLines', function (selector, token) {
	if (!selector) throw new Meteor.Error(400,'selector argument missing')
	const modifier = {
		fields: {
			token: 0
		}
	}
	console.log('pub segments')
	if (RunningOrderSecurity.allowReadAccess(selector, token, this)) {
		return SegmentLines.find(selector, modifier)
	}
	return this.ready()
})
