import { PeripheralDevices } from '../lib/collections/PeripheralDevices'
import { getCurrentTime } from '../lib/lib'

Meteor.onConnection((conn) => {

	let connectionId = conn.id
	// var clientAddress = conn.clientAddress; // ip-adress

	conn.onClose(() => {
		// called when a connection is closed

		if (connectionId) {

			PeripheralDevices.find({
				connectionId: connectionId
			}).forEach((p) => {

				// set the status of the machine to offline:

				PeripheralDevices.update(p._id, {$set: {
					lastSeen: getCurrentTime(),
					connected: false,
					// connectionId: ''
				}})
			})
		}
	})
})
