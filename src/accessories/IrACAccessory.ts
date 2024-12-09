import {PlatformAccessory, Service, UnknownContext} from 'homebridge';

import {AqaraIrControllerPlatform} from '../platform';
import {AbstractAccessory} from './AbstractAccessory';

export interface State {
  temperature: number;
  mode: number;
}

export class IrACAccessory extends AbstractAccessory {
  private readonly _primaryService: Service;

  private _state: State = {temperature: 23, mode: this.Characteristic.TargetHeatingCoolingState.OFF};

  constructor(
    protected readonly platform: AqaraIrControllerPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly data: UnknownContext,
  ) {
    super(platform, accessory, data);

    this._primaryService = this.accessory.getService(this.platform.api.hap.Service.Thermostat) || this.accessory.addService(
      this.platform.api.hap.Service.Thermostat);

    this._primaryService.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

    this._primaryService.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    this._primaryService.getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this._primaryService.getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));

    this._primaryService.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
      .onSet(this.handleTemperatureDisplayUnitsSet.bind(this));

    this._primaryService.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: 10,
        maxValue: 30,
        minStep : 1,
      });

    this._primaryService.getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: 10,
        maxValue: 30,
        minStep : 1,
      });


    this._getAqaraInfo(this.data.did).then((state) => {
      this._state = state;
    });
  }

  private _modeToState(mode: string) {
    switch (mode) {
      case 'M0':
        return this.Characteristic.TargetHeatingCoolingState.COOL;
      case 'M1':
        return this.Characteristic.TargetHeatingCoolingState.HEAT;
      case 'M2':
        return this.Characteristic.TargetHeatingCoolingState.AUTO;
      default:
        return this.Characteristic.TargetHeatingCoolingState.OFF;
    }
  }

  private _stateToMode(state: number): string {
    switch (state) {
      case this.Characteristic.TargetHeatingCoolingState.HEAT:
        return 'M1';
      case this.Characteristic.TargetHeatingCoolingState.COOL:
        return 'M0';
      default:
        return 'M2';
    }
  }

  private _stateToAqaraString(): string {
    const P = this._state.mode === this.Characteristic.TargetHeatingCoolingState.OFF ? 'P1' : 'P0';
    const M = this._stateToMode(this._state.mode);
    return `${P}_${M}_T${Math.floor(this._state.temperature)}_S0_D0`;
  }

  private _parseAqaraState(state: string): State {
    this.platform.log.debug('Parsing Aqara state: ', state);

    const split = state.split('_');

    let P = false;
    let T = 23;
    let M = this.Characteristic.CurrentHeatingCoolingState.OFF;

    split.forEach(value => {
      if (value[0] === 'P') {
        P = !parseInt(value[1]);
      }

      if (value[0] === 'M') {
        M = !P ? this.Characteristic.CurrentHeatingCoolingState.OFF : this._modeToState(value);
      }

      if (value[0] === 'T') {
        T = parseInt(value.substring(1));
      }
    });

    return {
      mode       : M,
      temperature: T,
    };
  }

  private _getAqaraInfo(did: string): Promise<State> {
    return this.platform.aqara.call('query.ir.acState', {
      did,
    }).then(data => {
      return this._parseAqaraState(data.result.acState);
    }, (err) => {
      this.platform.log.error('Unable to fetch Aqara response state: ', err);

      return {
        mode       : 0,
        temperature: 23,
      };
    });
  }

  private _sendStateToAqara() {
    this.platform.aqara.call('write.ir.click', {
      did         : this.data.did,
      brandId     : this.data.brandId,
      controllerId: this.data.controllerId,
      isAcMatch   : 1,
      acKey       : this._stateToAqaraString(),
    }).then(data => {
      this.platform.log.debug(data);
    });
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
  handleCurrentHeatingCoolingStateGet() {
    this.platform.log.debug('Triggered GET CurrentHeatingCoolingState');

    return this._state.mode;
  }

  /**
   * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
   */
  handleTargetHeatingCoolingStateGet() {
    this.platform.log.debug('Triggered GET TargetHeatingCoolingState');

    return this._state.mode;
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  handleTargetHeatingCoolingStateSet(value) {
    this.platform.log.debug('Triggered SET TargetHeatingCoolingState:', value);

    this._state.mode = value;

    this._sendStateToAqara();
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet() {
    this.platform.log.debug('Triggered GET CurrentTemperature');

    return this._state.temperature;
  }


  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  handleTargetTemperatureGet() {
    this.platform.log.debug('Triggered GET TargetTemperature');

    return this._state.temperature;
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  handleTargetTemperatureSet(value) {
    this.platform.log.debug('Triggered SET TargetTemperature:', value);

    this._state.temperature = value;

    this._sendStateToAqara();
  }

  /**
   * Handle requests to get the current value of the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsGet() {
    this.platform.log.debug('Triggered GET TemperatureDisplayUnits');

    return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  /**
   * Handle requests to set the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsSet(value) {
    this.platform.log.debug('Triggered SET TemperatureDisplayUnits:', value);
  }
}
