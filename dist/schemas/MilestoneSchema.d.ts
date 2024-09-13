import { Document, Types } from 'mongoose';
export type MilestoneDocument = Document & Milestone;
export declare class Milestone {
    userId: Types.ObjectId;
    type: string;
    message: string;
    points: number;
}
export declare const MilestoneSchema: import("mongoose").Schema<Milestone, import("mongoose").Model<Milestone, any, any, any, Document<unknown, any, Milestone> & Milestone & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Milestone, Document<unknown, {}, import("mongoose").FlatRecord<Milestone>> & import("mongoose").FlatRecord<Milestone> & {
    _id: Types.ObjectId;
}>;
