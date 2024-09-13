import { Document, Types } from 'mongoose';
export type CoinbankDocument = Document & Coinbank;
export declare class Coinbank {
    userId: Types.ObjectId;
    earnedCoins: number;
    coinsAvailable: number;
}
export declare const CoinbankSchema: import("mongoose").Schema<Coinbank, import("mongoose").Model<Coinbank, any, any, any, Document<unknown, any, Coinbank> & Coinbank & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Coinbank, Document<unknown, {}, import("mongoose").FlatRecord<Coinbank>> & import("mongoose").FlatRecord<Coinbank> & {
    _id: Types.ObjectId;
}>;
