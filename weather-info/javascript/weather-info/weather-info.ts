import {
  WinccoaManager,
  WinccoaConnectUpdateType,
  WinccoaError,
} from 'winccoa-manager';
const winccoa = new WinccoaManager();

import weatherJs from 'weather-js';

/**
 * Class that updates weather information using npm module weather-js.
 * @see https://www.npmjs.com/package/weather-js
 */
export class WeatherInfoUpdate {
  /**
   * Starts automatic update of weather info.
   */
  public start() {
    // updates weather info whenever location DPE changes.
    // Exception is not caught here, because if this connect fails,
    // the manager can be terminated, it will not produce any updates.
    winccoa.dpQueryConnectSingle(this.locationCB, true, this.query);

    // Also update weather info every 5 seconds, also if locations
    // do not change
    setInterval(() => this.updateWeatherInfo(), 5 * 1000);
  }

  /**
   * Query that returns the list of locations to update.
   */
  private query =
    "SELECT '_online.._value' FROM '*.location' WHERE _DPT=\"WeatherInfo\"";

  /**
   * Immediately updates all weather information using the callback
   * that is also used by dpQueryConnectSingle().
   */
  private async updateWeatherInfo() {
    try {
      const values = await winccoa.dpQuery(this.query);
      this.locationCB(values, WinccoaConnectUpdateType.Normal, undefined);
    } catch (err) {
      console.error('Unable to update weather info');
      console.error(err);
    }
  }

  /**
   * Callback for dpQueryConnectAll() containg location names.
   * @param values Values returned from query.
   * @param type Type of the update.
   * @param error Error information if there is an error.
   */
  private locationCB(
    values: unknown[][],
    type: WinccoaConnectUpdateType,
    error?: WinccoaError,
  ) {
    if (error) {
      console.error(error);
      return;
    }

    // provide some feedback, only at initial update
    if (type == WinccoaConnectUpdateType.Answer) {
      console.info('Initializing weather update');
    }

    for (let i = 1; i < values.length; i++) {
      let dp = values[i][0] as string;
      dp = dp.substring(0, dp.indexOf('.') + 1);
      WeatherInfoUpdate.updateWeatherDetails(dp, values[i][1] as string);
    }
  }

  /**
   * Update weather details for a single location.
   * @param dp DP where weather details will be written to.
   * @param location Name of the location.
   */
  private static updateWeatherDetails(dp: string, location: string): void {
    if (location == '') {
      console.warn('No location given for DP ' + dp);
      return;
    }

    weatherJs.find(
      {
        search: location,
        degreeType: 'C',
      },
      // callback that stores the received weather data
      async (err: Error, result: WeatherDetails[]) => {
        if (err) {
          console.error(err);
          return;
        }

        try {
          await winccoa.dpSetWait(
            [dp + 'locationDetails', dp + 'current', dp + 'forecast'],
            [
              JSON.stringify(result[0].location),
              JSON.stringify(result[0].current),
              JSON.stringify(result[0].forecast),
            ],
          );

          console.info('Updated: ' + location);
        } catch (err) {
          // report the error, but don't terminate
          console.error(err);
        }
      },
    );
  }
}
