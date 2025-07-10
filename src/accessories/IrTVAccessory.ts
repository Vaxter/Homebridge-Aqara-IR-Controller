import {PlatformAccessory, Service, UnknownContext} from 'homebridge';

import {AqaraIrControllerPlatform} from '../platform';
import {AbstractAccessory} from './AbstractAccessory';

export class IrTVAccessory extends AbstractAccessory {
  private readonly _primaryService: Service;

  private _state: number = this.Characteristic.Active.INACTIVE;

  constructor(
    protected readonly platform: AqaraIrControllerPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly data: UnknownContext,
  ) {
    super(platform, accessory, data);

    this._state = data.state === 1 ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE

    this._primaryService = this.accessory.getService(this.platform.api.hap.Service.Television) || this.accessory.addService(
      this.platform.api.hap.Service.Television);

    this._primaryService.getCharacteristic(this.Characteristic.Active)
        .onGet(this.handleCurrentActiveStateGet.bind(this));
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
  handleCurrentActiveStateGet() {
    this.platform.log.debug('Triggered GET Current Active State for TV');

    return this._state;
  }
}
