
import * as ntpClient from 'ntp-client'
import { GridAutoColumnsProperty } from 'csstype'
import { getCurrentTime, systemTime } from '../lib/lib'
import { StatusCode, setSystemStatus } from './systemStatus'

interface ServerTime {
	diff: number
	serverTime: number
	responseTime: number
}
let getServerTime = (host?: string, port?: number, timeout?: number): Promise<ServerTime> => {

	return new Promise((resolve, reject) => {
		ntpClient.ntpReplyTimeout = timeout || 500

		let sentTime = Date.now()
		ntpClient.getNetworkTime(
			host || '0.se.pool.ntp.org',
			port || 123,
			(err, date: Date, a, b) => {
				if (err) {
					reject(err)
					return
				} else {
					let replyTime = Date.now()
					resolve({
						diff: ((sentTime + replyTime) / 2) - date.getTime(),
						serverTime: date.getTime(),
						responseTime: replyTime - sentTime
					})
				}
			}
		)
	})
}
let standardDeviation = (arr: Array<number>): {mean: number, stdDev: number} => {
	let total = 0
	let mean = 0
	let diffSqredArr: Array<number> = []
	for (let i = 0;i < arr.length;i += 1 ) {
		total += arr[i]
	}
	mean = total / arr.length
	for (let j = 0; j < arr.length; j += 1) {
		diffSqredArr.push(Math.pow((arr[j] - mean),2))
	}
	return {
		mean: mean,
		stdDev: (Math.sqrt(diffSqredArr.reduce((firstEl, nextEl) => {
			return firstEl + nextEl
		}) / arr.length))
	}
}
interface Config {
	maxSampleCount?: number
	minSampleCount?: number
	maxAllowedDelay?: number
	maxTries?: number
	host?: string
	port?: number
}
/**
 * Send a number of calls to ntp-server, and calculate most-probable diff
 * compared to system time
 * https://stackoverflow.com/questions/1228089/how-does-the-network-time-protocol-work
 * @param config config object
 */
export function determineDiffTime (config: Config): Promise<{mean: number, stdDev: number}> {

	let maxSampleCount 	= config.maxSampleCount || 20
	let minSampleCount 	= config.minSampleCount || 10
	let maxAllowedDelay = config.maxAllowedDelay || 500
	let maxTries 		= config.maxTries || 20
	let host 			= config.host || ''
	let port 			= config.port || 0

	return new Promise((resolve, reject) => {

		let results: Array<ServerTime> = []
		let tryCount = 0
		let pushTime = () => {
			// console.log('a')
			tryCount++
			if (tryCount > maxTries) {
				if (tryCount > minSampleCount) {
					resolve(results)
				} else {
					reject('Max try count reached')
				}
				return
			}
			getServerTime(host, port, maxAllowedDelay)
			.then((result) => {
				results.push(result)
				if (results.length < maxSampleCount) pushTime()
				else resolve(results)
			})
			.catch((e) => {
				if (results.length < maxSampleCount) pushTime()
			})
		}
		pushTime()
	})
	.then((results: Array<ServerTime>) => {
		let diffAvg = 0
		let count = 0
		let diffSum = 0
		let halfResults = results.sort((a, b) => { // sort by response time, lower is better
			return a.responseTime - b.responseTime
		})
		.slice(0, Math.ceil(results.length / 2)) // use only the best half
		.map((result) => {
			return result.diff
		})
		if (halfResults.length < 4) throw Error('Too few results left')
		let stat = standardDeviation(halfResults)
		return stat
	})
}
Meteor.methods({
	'systemTime.determineDiffTime': () => {
		return determineDiffTime({
			maxSampleCount: 20,
			minSampleCount: 10,
			maxAllowedDelay: 500
		})
	},
	'systemTime.getTimeDiff': () => {
		return {
			currentTime: getCurrentTime(),
			systemRawTime: Date.now(),
			diff: systemTime.diff,
			stdDev: systemTime.stdDev,
			good: (systemTime.stdDev < 1000 / 50)
		}
	},
	'systemTime.getTime': () => {
		return getCurrentTime()
	}
})

let updateServerTime = () => {
	console.log('Updating systemTime...')
	determineDiffTime({
		maxSampleCount: 20,
		minSampleCount: 10,
		maxAllowedDelay: 500
	})
	.then((result) => {
		// if result.stdDev is less than one frame-time, it should be okay:
		if (result.stdDev < 1000 / 50) {
			console.log('Setting time-diff to ' + Math.round(result.mean) +
				' (stdDev: ' + result.stdDev + ')')
			systemTime.diff = result.mean
			systemTime.stdDev = result.stdDev
			setSystemStatus('systemTime', {statusCode: StatusCode.GOOD})
		} else {
			if (result.stdDev < systemTime.stdDev ) {
				systemTime.diff = result.mean
				systemTime.stdDev = result.stdDev
			}
			if (systemTime.stdDev < 200) {
				setSystemStatus('systemTime', {statusCode: StatusCode.WARNING_MAJOR})
			} else {
				setSystemStatus('systemTime', {statusCode: StatusCode.BAD})
			}
			setTimeout(() => {
				updateServerTime()
			}, 20 * 1000)
		}
	})
	.catch((err) => {
		console.log('systemTime Error', err)
		setSystemStatus('systemTime', {statusCode: StatusCode.BAD, messages: [err.toString()]})

		setTimeout(() => {
			updateServerTime()
		}, 20 * 1000)
	})
}
setSystemStatus('systemTime', {statusCode: StatusCode.BAD, messages: ['Starting up...'] })
Meteor.startup(() => {
	setInterval(() => {
		updateServerTime()
	}, 3600 * 1000)
	updateServerTime()
})

// Example usage:
// determineDiffTime({
// 	maxSampleCount: 20,
// 	minSampleCount: 10,
// 	maxAllowedDelay: 2000
// })
// .then((result) => {
// 	console.log('result', result)
// 	// if result.stdDev is less than one frame-time, we should be okay
// })