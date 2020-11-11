export interface Receipt {
  receiptId: string,
  amount: number, // amount to pay
  buyerUid: string, // id of the user buying the goods the payment
  buyerServiceId: string, // id of the service buying the goods
  sellerUid: string, // id of the user selling the goods
  sellerServiceId: string, // id of the service selling the goods
  paymentIntent: object,
  lastUpdateDate: object,
  creationDate: object
}