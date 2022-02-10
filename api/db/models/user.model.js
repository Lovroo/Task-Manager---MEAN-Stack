const mongoose = require("mongoose");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { use } = require("express/lib/application");

//jwt secret

const jwtSecret = "0875969879fsdf0875969879sfdsdfsdfsdf";

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  //vrnemo dokument razen gesla in sessions (nesmejo biti na voljo)
  return _.omit(userObject, ["password", "sessions"]);
};

UserSchema.methods.generateAccessAuthToken = function () {
  const user = this;
  return new Promise((resolve, reject) => {
    //naredimo Json web token in ga vrnemo
    jwt.sign(
      { _id: user._id.toHexString() },
      jwtSecret,
      { expiresIn: "15m" },
      (err, token) => {
        if (!err) {
          resolve(token);
        } else {
          reject();
        }
      }
    );
  });
};

UserSchema.methods.generateRefreshAuthToken = function () {
  //generiramo naključen string

  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (!err) {
        let token = buf.toString("hex");
        return resolve(token);
      }
    });
  });
};

UserSchema.methods.createSession = function () {
  let user = this;

  return user
    .generateRefreshAuthToken()
    .then((refreshToken) => {
      return saveSessionToDatabase(user, refreshToken);
    })
    .then((refreshToken) => {
      // uspešno shranjeno v db
      // zdaj vrnemo refresh token
      return refreshToken;
    })
    .catch((e) => {
      return Promise.reject("Failed to save session to database.\n" + e);
    });
};
//Model metode - statične metode
UserSchema.statics.getJWTSecret = () => {
  return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function (_id, token) {
  const user = this;

  return user.findOne({
    _id,
    "sessions.token": token,
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  let user = this;
  return user.findOne({email}).then((user) =>{
      if(!user){
          return Promise.reject();
      }
      else{
          return new Promise((resolve, reject) =>{
              bcrypt.compare(password, user.password,(err,res) =>{
                  if(res){
                      resolve(user);
                  }
                  else{
                      reject();
                  }
              }) 
          })
      }
  })
}
UserSchema.statics.hasRefreshTokenExpired = (expiresAt) =>{
    let secondsSinceEpoch = Date.now() / 1000;
    if(expiresAt > secondsSinceEpoch){
        // ni poteklo
        return false;
    }
    else{
        //poteklo
        return true;
    }
}

//Middleware
UserSchema.pre('save', function (next) {
    let user = this;
    let costFactor = 10;

    if (user.isModified('password')) {
        // Če se je geslo field spremenilo zaženemo to kodo
        // generiramo salt in hashamo geslo
        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            })
        })
    } else {
        next();
    }
});


//Helper metode
let saveSessionToDatabase = (user, refreshToken) => {
  // Shranimo session v db
  return new Promise((resolve, reject) => {
    let expiresAt = generateRefreshTokenExpiryTime();

    user.sessions.push({ token: refreshToken, expiresAt });

    user
      .save()
      .then(() => {
        // uspešno shranjen session
        return resolve(refreshToken);
      })
      .catch((e) => {
        reject(e);
      });
  });
};

let generateRefreshTokenExpiryTime = () => {
  let daysUntilExpire = "10";
  let secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
  return Date.now() / 1000 + secondsUntilExpire;
};


const User = mongoose.model('User', UserSchema)

module.exports = { User }