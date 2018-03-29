import { Meteor } from 'meteor/meteor'
import * as _ from 'underscore'
import { Mongo } from 'meteor/mongo'
/**
 * Convenience method to convert a Meteor.call() into a Promise
 * @param  {string} Method name
 * @return {Promise<any>}
 */
export function MeteorPromiseCall (callName: string, ...args: any[] ): Promise<any> {
	return new Promise((resolve, reject) => {
		Meteor.call(callName, ...args, (err, res) => {
			if (err) reject(err)
			else resolve(res)
		})
	})
}

export type Time = number

/**
 * Returns the current (synced) time
 * @return {Time}
 */
export function getCurrentTime (): Time {
	// TODO: Implement time sync feature
	// Just return the system time for now:
	return Date.now()
}
export interface DBObj {
	_id: string,
	[key: string]: any
}
interface SaveIntoDbOptions<T> {
	beforeInsert?: (o: T) => T
	beforeUpdate?: (o: T) => T
	beforeRemove?: (o: T) => T
	insert?: (o: T ) => void
	update?: (id: string, o: T ) => void
	remove?: (o: T ) => void
	afterInsert?: (o: T) => void
	afterUpdate?: (o: T) => void
	afterRemove?: (o: T) => void
}
/**
 * Saves an array of data into a collection
 * No matter if the data needs to be created, updated or removed
 * @param collection The collection to be updated
 * @param filter The filter defining the data subset to be affected in db
 * @param newData The new data
 */
export function saveIntoDb<T extends DBObj> (
	collection: Mongo.Collection<T>,
	filter: object,
	newData: Array<T>,
	optionsOrg?: SaveIntoDbOptions<T>
) {
	let change = {
		added: 0,
		updated: 0,
		removed: 0
	}
	let options: SaveIntoDbOptions<T> = optionsOrg || {}

	let identifier = 'id'

	let oldObjs = collection.find(filter).fetch()

	let newObjs2 = []

	let removeObjs: {[id: string]: DBObj} = {}
	_.each(oldObjs,function (o: DBObj) {

		if (removeObjs['' + o[identifier]]) {
			// duplicate id:
			collection.remove(o._id)
			change.removed++
		} else {
			removeObjs['' + o[identifier]] = o
		}

	})

	_.each(newData,function (o) {

		if (_.has(o,'type')) {
			o.type2 = o.type
			delete o.type
		}

		let oldObj = removeObjs['' + o[identifier]]
		if (oldObj) {

			let diff = compareObjs(oldObj,o)

			if (!diff) {
				let oUpdate = ( options.beforeUpdate ? options.beforeUpdate(o) : o)
				if (options.update) options.update(oldObj._id, oUpdate)
				else collection.update(oldObj._id,{$set: oUpdate})
				if (options.afterUpdate) options.afterUpdate(oUpdate)
				change.updated++
			}
		} else {
			if (!_.isNull(oldObj)) {
				let oInsert = ( options.beforeInsert ? options.beforeInsert(o) : o)
				if (options.insert) options.insert(oInsert)
				else collection.insert(oInsert)
				if (options.afterInsert) options.afterInsert(oInsert)
				change.added++
			}
		}
		delete removeObjs['' + o[identifier]]
	})
	_.each(removeObjs,function (obj: T, key) {
		if (obj) {

			if (!(obj.OP || {}).isActive) {
				let oRemove = ( options.beforeRemove ? options.beforeRemove(obj) : obj)
				if (options.remove) options.remove(oRemove)
				else collection.remove(oRemove._id)
				if (options.afterRemove) options.afterRemove(oRemove)
				change.removed++

			}
		}
	})
	return change
}
/**
 * Deep comparison of objects, returns true if equal
 * @param a
 * @param b
 * @param onlyKeysFromA If true, only uses the keys of (a) for comparison
 * @param omit Array of keys to omit in the comparison
 */
function compareObjs (a: any, b: any, onlyKeysFromA?: boolean, omit?: Array<string>): boolean {

	// let omit = ['_id','type','created','owner','OP','disabled']
	omit = omit || []

	let a0 = _.omit(a,omit)
	let b0 = _.omit(b,omit)

	let simpleCompare = (a: any, b: any, trace?: string) => {
		if (!trace) trace = ''
		let different: boolean | string = false

		if (_.isObject(a)) {
			if (_.isObject(b)) {

				let keys = (onlyKeysFromA ? _.keys(a) : _.union(_.keys(a), _.keys(b)))

				_.each(keys, (key) => {
					if (different === false) {
						different = simpleCompare(a[key], b[key], trace + '.' + key)
					}
				})

			} else different = trace + '>object'
		} else if (_.isArray(a)) {
			if (_.isArray(b) && a.length === b.length) {

				_.each(a, (val0, key) => {
					if (different === false) {
						different = simpleCompare(a[key], b[key], trace + '[' + key + ']')
					}
				})

			} else different = trace + '>array'
		} else {
			if (a !== b) different = trace + '(' + a + '!==' + b + ')'
		}

		return different
	}

	let diff = simpleCompare(a0,b0)

	return !diff
}
export function literal<T> (o: T) { return o }
export type Partial<T> = {
	[P in (keyof T)]?: T[P];
}
export function partial<T> (o: Partial<T>) {
	return o
}
export interface IDObj {
	_id: string
}
export function partialExceptId<T> (o: Partial<T> & IDObj) {
	return o
}
