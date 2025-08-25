from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import os
from typing import List

advanced_bp = Blueprint('advanced', __name__)

def _resolve_user_file(uploads_folder: str, file_key: str):
    from app import FileRecord
    rec = FileRecord.query.filter_by(filename=file_key, user_id=current_user.id).first()
    if not rec:
        return None, (jsonify({"error": "File not found"}), 404)
    path = os.path.join(uploads_folder, rec.filename)
    if not os.path.exists(path):
        return None, (jsonify({"error": "File not found on disk"}), 404)
    return path, None

@advanced_bp.route('/chat-pdf', methods=['POST'])
@login_required
def adv_chat_pdf():
    try:
        data = request.json or {}
        file_key = data.get('file_key')
        question = data.get('question')
        if not file_key or not question:
            return jsonify({"error": "Missing file_key or question"}), 400
        from app import UPLOAD_FOLDER
        fpath, err = _resolve_user_file(UPLOAD_FOLDER, file_key)
        if err:
            return err
        try:
            from tasks import chat_with_pdf
            res = chat_with_pdf.delay(fpath, question)
            return jsonify({"task_id": res.id}), 202
        except Exception:
            return jsonify({"error": "AI features not available"}), 503
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@advanced_bp.route('/analyze-pdf', methods=['POST'])
@login_required
def adv_analyze_pdf():
    try:
        data = request.json or {}
        file_key = data.get('file_key')
        if not file_key:
            return jsonify({"error": "Missing file_key"}), 400
        from app import UPLOAD_FOLDER
        fpath, err = _resolve_user_file(UPLOAD_FOLDER, file_key)
        if err:
            return err
        try:
            from tasks import analyze_pdf
            res = analyze_pdf.delay(fpath)
            return jsonify({"task_id": res.id}), 202
        except Exception:
            return jsonify({"error": "AI features not available"}), 503
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

@advanced_bp.route('/classify-document', methods=['POST'])
@login_required
def adv_classify_document():
    try:
        data = request.json or {}
        file_key = data.get('file_key')
        if not file_key:
            return jsonify({"error": "Missing file_key"}), 400
        from app import UPLOAD_FOLDER
        fpath, err = _resolve_user_file(UPLOAD_FOLDER, file_key)
        if err:
            return err
        try:
            from tasks import classify_document
            res = classify_document.delay(fpath)
            return jsonify({"task_id": res.id}), 202
        except Exception:
            return jsonify({"error": "MLflow not available"}), 503
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

@advanced_bp.route('/workflow', methods=['POST'])
@login_required
def adv_workflow():
    try:
        data = request.json or {}
        file_key = data.get('file_key')
        commands: List[str] = list(data.get('commands', []))
        if not file_key or not commands:
            return jsonify({"error": "Missing file_key or commands"}), 400
        from app import UPLOAD_FOLDER
        fpath, err = _resolve_user_file(UPLOAD_FOLDER, file_key)
        if err:
            return err
        try:
            from tasks import workflow_master
            res = workflow_master.delay(fpath, commands)
            return jsonify({"task_id": res.id}), 202
        except Exception:
            return jsonify({"error": "Workflow features not available"}), 503
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


