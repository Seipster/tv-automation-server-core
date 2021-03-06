import { StatusCode } from '../../server/systemStatus'

export type ExternalStatus = 'OK' | 'FAIL' | 'WARNING' | 'UNDEFINED'
export interface CheckObj {
	description: string
	status: ExternalStatus
	updated: string // Timestamp, on the form "2017-05-11T18:00:10+02:00" (new Date().toISOString())
	statusMessage?: string
	errors?: Array<CheckError>

	// internal fields (not according to spec):
	_status: StatusCode
}
export interface CheckError {
	type: string
	time: string // Timestamp, on the form "2017-05-11T18:00:10+02:00" (new Date().toISOString())
	message: string
}
export interface StatusResponseBase {
	status: ExternalStatus
	name: string
	updated: string

	statusMessage?: string // Tekstlig beskrivelse av status. (Eks: OK, Running, Standby, Completed successfully, 2/3 nodes running, Slow response time).
	instanceId?: string
	utilises?: Array<string>
	consumers?: Array<string>
	version?: '3' // version of healthcheck
	appVersion?: string

	checks?: Array<CheckObj>
	components?: Array<Component>

	// internal fields (not according to spec):
	_internal: {
		// statusCode: StatusCode,
		statusCodeString: string
		messages: Array<string>
	}
	_status: StatusCode
}
export interface StatusResponse extends StatusResponseBase {
	documentation: string
}
export interface Component extends StatusResponseBase {
	documentation?: string
}
export enum SystemStatusAPI {
	getSystemStatus = 'systemStatus.getSystemStatus'
}
