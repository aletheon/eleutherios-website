export interface Payment {
  paymentId: string,
  uid: string, // id of user creating this payment
  receiptId: string, // associated receipt for the seller receiving this payment
  amount: number, // amount to pay
  currency: string, // [usd, nzd, aud etc]
  quantity: number, // number of units ordered
  status: string, // [Pending, Success, Fail]
  buyerUid: string, // id of the user creating the payment
  buyerServiceId: string, // id of the service creating the payment
  buyerEmail: string,
  sellerUid: string, // id of the user receiving the payment
  sellerServiceId: string, // id of the service receiving the payment
  sellerEmail: string,
  paymentIntentId: string,
  lastUpdateDate: object,
  creationDate: object
}
