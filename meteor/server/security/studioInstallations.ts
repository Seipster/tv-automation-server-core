import { Meteor } from 'meteor/meteor'
import { StudioInstallation, StudioInstallations } from '../../lib/collections/StudioInstallations'

export namespace StudioInstallationsSecurity {
	export function allowReadAccess (selector: object, token: string, context) {

		return true
		// TODO: implement some security here
	}
	export function allowWriteAccess () {
		// TODO
	}
}
// Setup rules:

// Setup rules:
StudioInstallations.allow({
	insert (userId: string, doc: StudioInstallation): boolean {
		return false // Not allowed client-side
	},
	update (userId, doc, fields, modifier) {
		return false // Not allowed client-side
	},
	remove (userId, doc) {
		return false // Not allowed client-side
	}
})
