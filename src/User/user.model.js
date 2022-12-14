const {Schema, mongoose} = require('mongoose');

const codeVerification = new Schema({
    user_id: {type:mongoose.Schema.Types.ObjectId, ref: 'users'},
    code: {type: String},
    isUsed: {type: Boolean, default: false}
})

const userSchema = new Schema({
    first_name: {type: String, required:true},
    last_name: {type:String, required:true},
    email: {
        type:String, 
        required:true,
        validate:{
            validator: (v) => {
                return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(v)
            }
        },
        unique: [true, "Email must be unique"]
    },
    password: {type:String, required:true},
    status: {type:String, default:"Active"},
    role: {type:String, default:"User"},
    usertype: [
        {
            name: {type:String},
            slug: {type:String},
            view: {type:Boolean}
        }
    ],
    credite: {type: Number, default: 200000}
})

userSchema.set('timestamps', true);

userSchema.virtual('transactions', {
    ref: 'transactions',
    localField: '_id',
    foreignField: 'user_id'
})

const userModel = mongoose.model('users', userSchema);
const verificationModel = mongoose.model('verification', codeVerification)

module.exports = {userModel, verificationModel}