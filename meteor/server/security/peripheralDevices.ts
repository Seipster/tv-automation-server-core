import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'

import { PeripheralDevice, PeripheralDevices } from '../../lib/collections/PeripheralDevices'
import { rejectFields } from './lib'

export namespace PeripheralDeviceSecurity {

	export function getPeripheralDevice (id: string, token: string, context: any): PeripheralDevice {
		context = context || {}
		if (!id) throw new Meteor.Error(400,'id missing!')
		check(id, String)

		if (! (context || {}).userId) {
			if (!token) throw new Meteor.Error(400,'token missing!')
			check(token, String)
		}

		let peripheralDevice = PeripheralDevices.findOne(id)
		if (!peripheralDevice) throw new Meteor.Error(404, 'PeripheralDevice "' + id + '" not found' )
		// if (!peripheralDevice) return null

		if (peripheralDevice.token === token) return peripheralDevice

		/*if (context.userId) {
			check(context.userId, String)
			let user = Meteor.users.findOne(context.userId)
			if (user) {
				// TODO: add user access check here, when accounts have been implemented
				return peripheralDevice
			}
		}*/

		throw new Meteor.Error(401,'Not allowed access to peripheralDevice')
	}
	export function allowReadAccess (selector: object, token: string, context: any) {

		if (selector['_id'] && token) {

			check(selector['_id'], String)

			PeripheralDeviceSecurity.getPeripheralDevice(selector['_id'], token, context)

			return true
		} else {

			// TODO: implement access logic here
			// use context.userId

			// just returning true for now
			return true
		}
	}
	export function allowWriteAccess () {
		// TODO
	}
}
// Setup rules:

PeripheralDevices.allow({
	insert (userId: string, doc: PeripheralDevice): boolean {
		return true
	},
	update (userId, doc, fields, modifier) {
		return rejectFields(fields, [
			'type',
			'parentDeviceId',
			'versions',
			'expectedVersions',
			'created',
			'status',
			'lastSeen',
			'lastConnected',
			'connected',
			'connectionId',
			'token',
			// 'settings' is allowed
		])
	},

	remove (userId, doc) {
		return false
	}
})
