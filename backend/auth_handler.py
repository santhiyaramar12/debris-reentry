import jwt  # type: ignore
import datetime
import uuid
from functools import wraps
from flask import request, jsonify, current_app  # type: ignore
from bson.objectid import ObjectId  # type: ignore

SECRET_KEY = "mission_control_super_secret_2024"

# 1. TWO TOKEN GENERATION (Access + Refresh)
def generate_tokens(user_id, role):
    # Access Token - 24 Hours
    access_payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_id),
        'role': role,
        'type': 'access'
    }
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm='HS256')

    # Refresh Token - 30 Days
    refresh_payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30),
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_id),
        'jti': str(uuid.uuid4()),
        'type': 'refresh'
    }
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm='HS256')

    return access_token, refresh_token

# 2. MIDDLEWARE (General Token Check)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1] if " " in token else token
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            
            if data.get('type') != 'access':
                return jsonify({'message': 'Invalid token type! Use Access Token.'}), 401

            setattr(request, 'user_id', data['sub'])
            setattr(request, 'user_role', data['role'])
            
            from app import db  # type: ignore
            current_user = db.users.find_one({"_id": ObjectId(data['sub'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired! Use refresh token.'}), 401
        except Exception as e:
            return jsonify({'message': f'Token is invalid! {str(e)}'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

# 3. ROLE-BASED MIDDLEWARE (Supervisor Only - Legacy)
def supervisor_only(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        role = getattr(request, 'user_role', None)
        if role != 'supervisor':
            return jsonify({'message': 'Access Denied: Mission Supervisor role required!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# 4. ROLE-BASED MIDDLEWARE (Admin Only)
def admin_only(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        role = getattr(request, 'user_role', None)
        if role not in ('admin', 'supervisor'):
            return jsonify({'message': 'Access Denied: Admin privileges required!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated