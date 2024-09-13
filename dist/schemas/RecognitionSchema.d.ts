import { Document, Types } from 'mongoose';
export type RecognitionDocument = Document & Recognition;
export declare class Recognition {
    giverId: Types.ObjectId;
    receiverId: Types.ObjectId;
    message: string;
}
export declare const RecognitionSchema: import("mongoose").Schema<Recognition, import("mongoose").Model<Recognition, any, any, any, Document<unknown, any, Recognition> & Recognition & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Recognition, Document<unknown, {}, import("mongoose").FlatRecord<Recognition>> & import("mongoose").FlatRecord<Recognition> & {
    _id: Types.ObjectId;
}>;
