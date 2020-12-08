export interface Payment {
  paymentId: string,
  receiptId: string,
  amount: number, // amount to pay
  currency: string, // [usd, nzd, aud etc]
  description: string, // description of product/service
  status: string, // [Pending, Success, Fail]
  buyerUid: string, // id of the user creating the payment
  buyerServiceId: string, // id of the service creating the payment
  sellerUid: string, // id of the user receiving the payment
  sellerServiceId: string, // id of the service receiving the payment
  paymentIntent: object,
  lastUpdateDate: object,
  creationDate: object
}