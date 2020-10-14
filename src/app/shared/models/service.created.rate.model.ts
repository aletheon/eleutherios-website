export interface ServiceCreatedRate {
  serviceCreatedRateId: string,
  serviceRateId: string,
  serviceRateServiceId: string, // service being rated
  serviceRateServiceUid: string, // owner of service being rated
  rate: number,
  lastUpdateDate: object,
  creationDate: object
}