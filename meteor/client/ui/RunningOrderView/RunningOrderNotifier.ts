import { Tracker } from 'meteor/tracker'
import { Meteor } from 'meteor/meteor'

import * as _ from 'underscore'

import { NotificationCenter, NotificationList, NotifierObject, Notification, NoticeLevel } from '../../lib/notifications/notifications'
import { RunningOrderAPI } from '../../../lib/api/runningOrder'

import { ReactiveDataHelper, WithManagedTracker } from '../../lib/reactiveData/reactiveDataHelper'
import { reactiveData } from '../../lib/reactiveData/reactiveData'
import { checkSLIContentStatus } from '../../../lib/mediaObjects'
import { PeripheralDeviceAPI } from '../../../lib/api/peripheralDevice'
import { PeripheralDevice } from '../../../lib/collections/PeripheralDevices'
import { ShowStyleBases } from '../../../lib/collections/ShowStyleBases'

export class RunningOrderViewNotifier extends WithManagedTracker {
	private _notificationList: NotificationList
	private _notifier: NotifierObject

	private _mediaStatus: _.Dictionary<Notification | undefined> = {}
	private _mediaStatusDep: Tracker.Dependency

	private _deviceStatus: _.Dictionary<Notification | undefined> = {}
	private _deviceStatusDep: Tracker.Dependency

	constructor (runningOrderId: string) {
		super()
		this._notificationList = new NotificationList([])
		this._mediaStatusDep = new Tracker.Dependency()
		this._deviceStatusDep = new Tracker.Dependency()

		this._notifier = NotificationCenter.registerNotifier((): NotificationList => {
			return this._notificationList
		})
		ReactiveDataHelper.registerComputation('RunningOrderView.MediaObjectStatus', this.autorun(() => {
			const rRunningOrderId = reactiveData.getRRunningOrderId(runningOrderId).get()

			if (rRunningOrderId) {
				const studioInstallationId = reactiveData.getRRunningOrderStudioId(rRunningOrderId).get()
				const showStyleBaseId = reactiveData.getRRunningOrderShowStyleBaseId(rRunningOrderId).get()
				ReactiveDataHelper.registerComputation('RunningOrderView.MediaObjectStatus.StudioInstallation', this.autorun(() => {
					// const studioInstallation = StudioInstallations.findOne(studioInstallationId)
					const showStyleBase = ShowStyleBases.findOne(showStyleBaseId)
					if (showStyleBase) {
						let oldItemIds: Array<string> = []
						ReactiveDataHelper.registerComputation('RunningOrderView.MediaObjectStatus.SegmentLineItems', this.autorun((comp: Tracker.Computation) => {
							const items = reactiveData.getRSegmentLineItems(rRunningOrderId).get()
							const newItemIds = items.map(item => item._id)
							items.forEach((item) => {
								const sourceLayer = reactiveData.getRSourceLayer(showStyleBase, item.sourceLayerId).get()
								if (sourceLayer) {
									ReactiveDataHelper.registerComputation(`RunningOrderView.MediaObjectStatus.SegmentLineItems.${item._id}`, this.autorun(() => {
										const { metadata, status, message } = checkSLIContentStatus(item, sourceLayer, showStyleBase.config)
										let newNotification: Notification | undefined = undefined
										if ((status !== RunningOrderAPI.LineItemStatusCode.OK) && (status !== RunningOrderAPI.LineItemStatusCode.UNKNOWN)) {
											newNotification = new Notification(item._id, NoticeLevel.WARNING, message || 'Media is broken', 'Media', Date.now(), true)
										}
										if (newNotification && this._mediaStatus[item._id] !== newNotification && (
											((this._mediaStatus[item._id] || { message: null }).message !== newNotification.message) ||
											((this._mediaStatus[item._id] || { status: null }).status !== newNotification.status)
										)) {
											this._mediaStatus[item._id] = newNotification
											this._mediaStatusDep.changed()
										} else if (!newNotification && this._mediaStatus[item._id]) {
											delete this._mediaStatus[item._id]
											this._mediaStatusDep.changed()
										}
									}))
								} else {
									ReactiveDataHelper.stopComputation(`RunningOrderView.MediaObjectStatus.SegmentLineItems.${item._id}`)

									delete this._mediaStatus[item._id]
									this._mediaStatusDep.changed()
								}
							})

							_.difference(oldItemIds, newItemIds).forEach((item) => {
								delete this._mediaStatus[item]
								this._mediaStatusDep.changed()
							})
							oldItemIds = newItemIds
						}))

						let oldDevItemIds: Array<string> = []
						ReactiveDataHelper.registerComputation('RunningOrderView.PeripheralDevices', this.autorun(() => {
							if (studioInstallationId) {
								Meteor.subscribe('peripheralDevices', { studioInstallationId: studioInstallationId })
							}
							const devices = studioInstallationId ? reactiveData.getRPeripheralDevices(studioInstallationId).get() : []
							const newDevItemIds = devices.map(item => item._id)

							devices.forEach((item) => {
								let newNotification: Notification | undefined = undefined

								if (item.status.statusCode !== PeripheralDeviceAPI.StatusCode.GOOD || !item.connected) {
									newNotification = new Notification(item._id, this.convertDeviceStatus(item), this.makeDeviceMessage(item), 'Devices', Date.now(), true)
								}
								if (newNotification && this._deviceStatus[item._id] !== newNotification && (
									((this._deviceStatus[item._id] || { message: null }).message !== newNotification.message) ||
									((this._deviceStatus[item._id] || { status: null }).status !== newNotification.status)
								)) {
									this._deviceStatus[item._id] = newNotification
									this._deviceStatusDep.changed()
								} else if (!newNotification && this._deviceStatus[item._id]) {
									delete this._deviceStatus[item._id]
									this._deviceStatusDep.changed()
								}
							})

							_.difference(oldDevItemIds, newDevItemIds).forEach((item) => {
								delete this._deviceStatus[item]
								this._deviceStatusDep.changed()
							})
							oldItemIds = newDevItemIds
						}))
					} else {
						ReactiveDataHelper.stopComputation('RunningOrderView.MediaObjectStatus.SegmentLineItems')
						ReactiveDataHelper.stopComputation('RunningOrderView.PeripheralDevices')
						this.cleanUpMediaStatus()
					}
				}))
			} else {
				ReactiveDataHelper.stopComputation('RunningOrderView.MediaObjectStatus.StudioInstallation')
				this.cleanUpMediaStatus()
			}
		}))

		this.autorun((comp) => {
			this._mediaStatusDep.depend()
			this._deviceStatusDep.depend()

			this._notificationList.set(_.compact(_.values(this._mediaStatus)).concat(_.compact(_.values(this._deviceStatus))))
		})
	}

	stop () {
		super.stop()

		this._notifier.stop()

		ReactiveDataHelper.stopComputation('RunningOrderView.MediaObjectStatus')
	}

	private cleanUpMediaStatus () {
		this._mediaStatus = {}
		this._mediaStatusDep.changed()
	}

	private convertDeviceStatus (device: PeripheralDevice): NoticeLevel {
		if (!device.connected) {
			return NoticeLevel.CRITICAL
		}
		switch (device.status.statusCode) {
			case PeripheralDeviceAPI.StatusCode.GOOD:
				return NoticeLevel.NOTIFICATION
			case PeripheralDeviceAPI.StatusCode.UNKNOWN:
				return NoticeLevel.CRITICAL
			case PeripheralDeviceAPI.StatusCode.WARNING_MAJOR:
				return NoticeLevel.WARNING
			case PeripheralDeviceAPI.StatusCode.WARNING_MINOR:
				return NoticeLevel.WARNING
			case PeripheralDeviceAPI.StatusCode.BAD:
				return NoticeLevel.CRITICAL
			case PeripheralDeviceAPI.StatusCode.FATAL:
				return NoticeLevel.CRITICAL
			default:
				return NoticeLevel.NOTIFICATION
		}
	}

	private makeDeviceMessage (device: PeripheralDevice): string {
		if (!device.connected) {
			return `Device ${device.name} is disconnected`
		}
		return `${device.name}: ` + (device.status.messages || ['']).join(', ')
	}
}
