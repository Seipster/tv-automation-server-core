import { Mongo } from 'meteor/mongo'
import { TransformedCollection } from '../typings/meteor'
import { Time, registerCollection } from '../lib'

export interface UserActionsLogItem {
	_id: string,
	userId: string,
	clientAddress: string,
	timestamp: Time,
	method: string,
	args: string,
	success?: boolean,
	doneTime?: Time,
	executionTime?: Time,
	errorMessage?: string
}

export const UserActionsLog: TransformedCollection<UserActionsLogItem, UserActionsLogItem>
	= new Mongo.Collection<UserActionsLogItem>('userActionsLog')
registerCollection('UserActionsLog', UserActionsLog)
