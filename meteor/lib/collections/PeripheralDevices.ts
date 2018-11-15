import { Mongo } from 'meteor/mongo'
import { PeripheralDeviceAPI } from '../api/peripheralDevice'
import { Time, registerCollection } from '../lib'
import { TransformedCollection } from '../typings/meteor'
import { Meteor } from 'meteor/meteor'
export interface PeripheralDevice {
	_id: string

	name: string
	type: PeripheralDeviceAPI.DeviceType

	studioInstallationId: string
	parentDeviceId?: string
	/** Versions reported from the device */
	versions?: {
		[libraryName: string]: string
	}
	/** Expected versions (at least this) */
	expectedVersions?: {
		[libraryName: string]: string
	}

	created: Time
	status: PeripheralDeviceAPI.StatusObject
	lastSeen: Time // Updated continously while connected
	lastConnected: Time // Updated upon connection, not continously

	connected: boolean
	connectionId: string|null // Id of the current ddp-Connection

	token: string

	settings?: MosDeviceSettings | PlayoutDeviceSettings
}

export interface MosDevice extends PeripheralDevice {
	type: PeripheralDeviceAPI.DeviceType.MOSDEVICE,

	settings?: MosDeviceSettings

	lastDataReceived?: Time
}

export interface MosDeviceSettings {
	mosId: string,
	devices: {
		[deviceId: string]: MosDeviceSettingsDevice
	}
}
export interface MosDeviceSettingsDevice {
	primary: MosDeviceSettingsDeviceOptions
	secondary?: MosDeviceSettingsDeviceOptions
}
export interface MosDeviceSettingsDeviceOptions {
	id: string
	host: string
}
export enum PlayoutDeviceType { // to match DeviceType in TSR
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3,
	HTTPSEND = 4,
	PANASONIC_PTZ = 5,
	// TCPSEND = 6, // to be implemented
	HYPERDECK = 7,
	PHAROS = 8,
	SCANNER = 9,
	LAUNCHER = 10
}
export const DefaultPlayoutDevicePort = {
	1: 5250,	// CASPARCG
	2: 9910,	// ATEM
	3: 9000,	// LAWO
	4: 9993,	// HYPERDECK
	9: 8000,	// SCANNER
	10: 8005	// LAUNCHER
}

export interface PlayoutDeviceSettings {
	devices: {
		[deviceId: string]: PlayoutDeviceSettingsDevice
	}
	mediaScanner: {
		host: string
		port: number
	}
}
export interface PlayoutDeviceSettingsDevice {
	type: PlayoutDeviceType
	options?: {}
}
export interface PlayoutDeviceSettingsDeviceCasparCG extends PlayoutDeviceSettingsDevice {
	type: PlayoutDeviceType.CASPARCG
	options: {
		host: string,
		port: number,
		useScheduling?: boolean, // whether to use the CasparCG-SCHEDULE command to run future commands, or the internal (backwards-compatible) command queue
		launcherHost: string,
		launcherPort: string
	}
}
export interface PlayoutDeviceSettingsDeviceAtem extends PlayoutDeviceSettingsDevice {
	type: PlayoutDeviceType.ATEM
	options: {
		host: string,
		port?: number
	}
}

export interface PanasonicDeviceSettings {
	identifier: string
	url: string
}

export interface PlayoutDeviceSettingsDevicePanasonicPTZ extends PlayoutDeviceSettingsDevice {
	type: PlayoutDeviceType.PANASONIC_PTZ
	options: {
		cameraDevices: Array<PanasonicDeviceSettings>
	}
}

export interface PlayoutDeviceSettingsDeviceHyperdeck extends PlayoutDeviceSettingsDevice {
	type: PlayoutDeviceType.HYPERDECK
	options: {
		host: string,
		port?: number
	}
}

export const PeripheralDevices: TransformedCollection<PeripheralDevice, PeripheralDevice>
	= new Mongo.Collection<PeripheralDevice>('peripheralDevices')
registerCollection('PeripheralDevices', PeripheralDevices)
Meteor.startup(() => {
	if (Meteor.isServer) {
		PeripheralDevices._ensureIndex({
			studioInstallationId: 1
		})
	}
})
