export interface Receipt {
  receiptId: string,
  uid: string, // id of the user creating the payment
  amount: number, // amount to pay
  serviceId: string, // id of the service creating the payment
  merchantUid: string, // id of the user receiving the payment
  merchantServiceId: string, // id of the service receiving the payment
  paymentIntent: object,
  lastUpdateDate: object,
  creationDate: object
}