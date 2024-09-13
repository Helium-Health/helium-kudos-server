import { Document, Types } from 'mongoose';
export type ChallengeDocument = Document & Challenge;
export declare class Challenge {
    title: string;
    description: string;
    points: number;
    creatorId: Types.ObjectId;
}
export declare const ChallengeSchema: import("mongoose").Schema<Challenge, import("mongoose").Model<Challenge, any, any, any, Document<unknown, any, Challenge> & Challenge & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Challenge, Document<unknown, {}, import("mongoose").FlatRecord<Challenge>> & import("mongoose").FlatRecord<Challenge> & {
    _id: Types.ObjectId;
}>;
