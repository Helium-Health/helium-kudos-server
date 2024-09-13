import { Document, Types } from 'mongoose';
export type LeaderboardDocument = Document & Leaderboard;
export declare class Leaderboard {
    userId: Types.ObjectId;
    points: number;
    rank: number;
}
export declare const LeaderboardSchema: import("mongoose").Schema<Leaderboard, import("mongoose").Model<Leaderboard, any, any, any, Document<unknown, any, Leaderboard> & Leaderboard & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Leaderboard, Document<unknown, {}, import("mongoose").FlatRecord<Leaderboard>> & import("mongoose").FlatRecord<Leaderboard> & {
    _id: Types.ObjectId;
}>;
