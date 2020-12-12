export interface Receipt {
  receiptId: string,
  paymentId: string,
  amount: number, // amount to pay
  currency: string, // [usd, nzd, aud etc]
  title: string, // title of product/service
  description: string, // description of product/service
  quantity: number, // number of units ordered
  status: string, // [Pending, Success, Fail]
  buyerUid: string, // id of the user creating the payment
  buyerServiceId: string, // id of the service creating the payment
  sellerUid: string, // id of the user receiving the payment
  sellerServiceId: string, // id of the service receiving the payment
  paymentIntent: object,
  lastUpdateDate: object,
  creationDate: object
}