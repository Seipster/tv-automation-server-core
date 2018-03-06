import { Meteor }            from 'meteor/meteor';
import * as React            from 'react';
import * as ReactDOM         from 'react-dom';
import {withTracker}         from '../lib/ReactMeteorData/react-meteor-data';
import {PeripheralDevice,
        PeripheralDevices}   from '../../lib/collections/PeripheralDevices';
import {PeripheralDeviceAPI} from '../../lib/api/peripheralDevice';
import * as ClassNames       from 'classnames';

interface IDeviceItemPropsHeader {
	key: string,
	device: PeripheralDevice
}
export class DeviceItem extends React.Component<IDeviceItemPropsHeader> {
  statusCodeString() {
    switch (this.props.device.status.statusCode) {
      case PeripheralDeviceAPI.StatusCode.UNKNOWN:
        return "Unknown";
      case PeripheralDeviceAPI.StatusCode.GOOD:
        return "Good";
      case PeripheralDeviceAPI.StatusCode.WARNING_MINOR:
        return "Minor Warning";
      case PeripheralDeviceAPI.StatusCode.WARNING_MAJOR:
        return "Warning";
      case PeripheralDeviceAPI.StatusCode.BAD:
        return "Bad";
      case PeripheralDeviceAPI.StatusCode.FATAL:
        return "Fatal";
    }
  }

  connectedString() {
    if (this.props.device.connected) {
      return "Connected";
    } else {
      return "Disconnected";
    }
  }

  deviceTypeString() {
    switch (this.props.device.type) {
      case PeripheralDeviceAPI.DeviceType.MOSDEVICE:
        return "MOS Device";
      case PeripheralDeviceAPI.DeviceType.PLAYOUT:
        return "Playout Device";
      default:
        return "Unknown Device";
    }
  }

	render() {
    var statusClassNames = ClassNames({
      "device-item__device-status": true,
      "device-item__device-status--unknown": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.UNKNOWN,
      "device-item__device-status--good": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.GOOD,
      "device-item__device-status--minor-warning": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.WARNING_MINOR,
      "device-item__device-status--warning": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.WARNING_MAJOR,
      "device-item__device-status--bad": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.BAD,
      "device-item__device-status--fatal": this.props.device.status.statusCode == PeripheralDeviceAPI.StatusCode.FATAL
    });

		return (
			<tr className="device-item">
				<td className="device-item__name">{this.props.device.name}</td>
				<td className="device-item__connected">{this.connectedString()}</td>
				<td className="device-item__type">{this.deviceTypeString()}</td>
				<td className={statusClassNames}>
          <span className="device-item__device-status__label">{this.statusCodeString()}</span>
        </td>
				<td className="device-item__last-seen">{new Date(this.props.device.lastSeen).toString()}</td>
			</tr>
		)
	}
}


interface IPropsHeader {
	devices: Array<PeripheralDevice>
}
export class SystemStatus extends React.Component<IPropsHeader> {
	renderPeripheralDevices() {
		return this.props.devices.map((device) => (
			<DeviceItem key={device._id} device={device} />
		));
	}

	render() {
		return (
			<div>
				<header className="mvl">
					<h1>System Status</h1>
				</header>
				<div className="mod mvl">
					<table className="table">
						<thead>
							<tr>
								<th className="c3">
									Name
								</th>
                <th className="c1">
                Connected
                </th>
								<th className="c2">
									Type
								</th>
								<th className="c2">
									Status
								</th>
								<th className="c4">
									Last seen
								</th>
							</tr>
						</thead>
						<tbody>
							{this.renderPeripheralDevices()}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}

export default withTracker(() => {
	// console.log('PeripheralDevices',PeripheralDevices);
	// console.log('PeripheralDevices.find({}).fetch()',PeripheralDevices.find({}, { sort: { created: -1 } }).fetch());

	return {
		devices: PeripheralDevices.find({}, { sort: { created: -1 } }).fetch(),
	};
})(SystemStatus);
