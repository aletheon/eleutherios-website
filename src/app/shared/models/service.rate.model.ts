export interface ServiceRate {
  serviceRateId: string,
  serviceRateServiceId: string, // service being rated
  serviceRateServiceUid: string, // owner of service being rated
  serviceId: string, // service doing rating
  serviceUid: string, // owner of service doing rating
  rate: number, // rate
  lastUpdateDate: object,
  creationDate: object
}