'use strict';

/**
 * @fileoverview Mongoose User model for admin authentication.
 * Includes password hashing pre-save hook and password comparison method.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * @typedef {Object} IUser
 * @property {string} username - Unique username
 * @property {string} email - Unique email address
 * @property {string} password - Bcrypt hashed password
 * @property {'admin'|'superadmin'} role - User role
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username must not exceed 50 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'superadmin'],
        message: 'Role must be either admin or superadmin',
      },
      default: 'admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// ─── Pre-save Hook: Hash Password ─────────────────────────────────────────────

/**
 * Hashes the user's password before saving if it has been modified.
 * Uses bcryptjs with configurable salt rounds.
 */
userSchema.pre('save', async function hashPassword(next) {
  // Only hash if password field was modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compares a plain-text password with the stored hash.
 * @param {string} candidatePassword - Plain-text password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Returns a safe public representation of the user (no password).
 * @returns {Object} Safe user object
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Finds a user by email and includes the password field (normally excluded).
 * @param {string} email - Email address to search
 * @returns {Promise<IUser|null>}
 */
userSchema.statics.findByEmailWithPassword = function findByEmailWithPassword(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
