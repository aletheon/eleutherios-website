export interface Payment {
  paymentId: string,
  uid: string, // id of the user creating the payment
  serviceId: string, // id of the service creating the payment
  paymentIntent: object,
  lastUpdateDate: object, 
  creationDate: object 
}