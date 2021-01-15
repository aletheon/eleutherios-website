export interface Receipt {
  receiptId: string,
  uid: string, // id of user creating this receipt
  paymentId: string,
  amount: number, // amount to pay
  currency: string, // [usd, nzd, aud etc]
  buyerType: string,
  buyerPaymentType: string,
  buyerTitle: string,
  buyerDescription: string,
  sellerType: string,
  sellerPaymentType: string,
  sellerTitle: string,
  sellerDescription: string,
  quantity: number, // number of units ordered
  status: string, // [Pending, Success, Fail]
  buyerUid: string, // id of the user creating the payment
  buyerServiceId: string, // id of the service creating the payment
  sellerUid: string, // id of the user receiving the payment
  sellerServiceId: string, // id of the service receiving the payment
  paymentIntentId: string,
  lastUpdateDate: object,
  creationDate: object
}