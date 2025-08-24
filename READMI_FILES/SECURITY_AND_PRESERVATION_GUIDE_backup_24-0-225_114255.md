# 🔒 Security & File Preservation Guide

## ⚠️ CRITICAL: File Preservation Rules

### 🚨 **NEVER DELETE THESE FILES:**
```
PDF2/
├── app.py                    # MAIN APPLICATION - NEVER DELETE
├── static/                   # FRONTEND FILES - NEVER DELETE
│   ├── index.html           # Main HTML file
│   └── app.js              # React application
├── requirements.txt          # DEPENDENCIES - NEVER DELETE
├── README.md                # MAIN DOCUMENTATION - NEVER DELETE
├── .gitignore               # GIT CONFIG - NEVER DELETE
├── LICENSE                  # LICENSE FILE - NEVER DELETE
├── pdf_tool.py             # CLI TOOL - NEVER DELETE
├── tasks.py                 # CELERY TASKS - NEVER DELETE
├── sdk.py                   # CLIENT SDK - NEVER DELETE
├── tests/                   # TEST FILES - NEVER DELETE
├── uploads/                 # USER UPLOADS - NEVER DELETE
├── processed/               # PROCESSED FILES - NEVER DELETE
└── pdf_tool.db             # DATABASE - NEVER DELETE
```

### ✅ **SAFE TO MOVE TO BIN:**
- Old versions of files (with timestamps)
- Test scripts that are no longer needed
- Temporary utility scripts
- Old documentation files
- Docker files (if not using Docker)

### 🔒 **SECURITY CRITICAL FILES:**
- **`.env` files** - May contain secrets
- **`*.key` files** - Private keys
- **`*.pem` files** - Certificates
- **`config.py`** - Configuration files
- **Database files** - User data

## 🛡️ Security Checkup Checklist

### 1. **Authentication Security** ✅
- [ ] Passwords are hashed (not plain text)
- [ ] Session management is secure
- [ ] Login attempts are limited
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts

### 2. **File Security** ✅
- [ ] File upload validation (PDF only)
- [ ] File size limits enforced
- [ ] Path traversal protection
- [ ] User file isolation
- [ ] Secure file deletion

### 3. **Input Validation** ✅
- [ ] JSON payload validation
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Input sanitization

### 4. **Database Security** ✅
- [ ] Database connection is secure
- [ ] User permissions are minimal
- [ ] Sensitive data is encrypted
- [ ] Database backups are secure
- [ ] Connection pooling is configured

### 5. **Network Security** ✅
- [ ] HTTPS enabled in production
- [ ] Firewall rules configured
- [ ] Rate limiting implemented
- [ ] DDoS protection enabled
- [ ] Network monitoring active

## 📋 **File Preservation Instructions**

### **Before Making Changes:**

1. **Create Backup**
   ```bash
   # Create timestamped backup
   mkdir backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')
   Copy-Item * backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')/
   ```

2. **Use Git for Version Control**
   ```bash
   # Commit current state
   git add .
   git commit -m "Backup before changes - $(Get-Date)"
   ```

3. **Use Bin System Instead of Deletion**
   ```bash
   # Move files to bin instead of deleting
   python cleanup_to_bin.py cleanup
   ```

### **When Adding New Features:**

1. **Create New Files** - Don't modify existing ones
2. **Use Configuration Files** - Don't hardcode values
3. **Document Changes** - Update README files
4. **Test Thoroughly** - Before deploying

### **When Removing Features:**

1. **Move to Bin** - Don't delete
2. **Update Documentation** - Remove references
3. **Test Dependencies** - Ensure nothing breaks
4. **Keep History** - For potential rollback

## 🔍 **Security Audit Commands**

### **Check for Hardcoded Secrets:**
```bash
# Search for potential secrets in code
grep -r "password\|secret\|key\|token" . --exclude-dir=venv --exclude-dir=.git
```

### **Check File Permissions:**
```bash
# Check file permissions
Get-ChildItem -Recurse | Get-Acl | Where-Object {$_.Access.FileSystemRights -match "FullControl"}
```

### **Check for Vulnerable Dependencies:**
```bash
# Check for known vulnerabilities
pip-audit
```

### **Check Database Security:**
```bash
# Verify database file permissions
Get-Acl "pdf_tool.db" | Format-List
```

## 🚨 **Emergency Recovery Procedures**

### **If Critical Files Are Deleted:**

1. **Check Bin Folder**
   ```bash
   python cleanup_to_bin.py list
   ```

2. **Restore from Bin**
   ```bash
   python cleanup_to_bin.py restore filename_with_timestamp
   ```

3. **Check Git History**
   ```bash
   git log --oneline
   git checkout <commit_hash> -- filename
   ```

4. **Restore from Backup**
   ```bash
   Copy-Item "backup_*/filename" "."
   ```

### **If Database is Corrupted:**

1. **Check Instance Folder**
   ```bash
   if (Test-Path "instance/pdf_tool.db") {
       Copy-Item "instance/pdf_tool.db" "pdf_tool.db"
   }
   ```

2. **Recreate Database**
   ```bash
   Remove-Item "pdf_tool.db"
   python app.py
   ```

## 📚 **Best Practices Summary**

### **File Management:**
- ✅ Always use the bin system
- ✅ Create backups before major changes
- ✅ Use Git for version control
- ✅ Test changes thoroughly
- ❌ Never delete files directly
- ❌ Never modify production files without backup

### **Security Management:**
- ✅ Regular security audits
- ✅ Update dependencies regularly
- ✅ Monitor access logs
- ✅ Use environment variables for secrets
- ✅ Implement proper authentication
- ❌ Never commit secrets to Git
- ❌ Never use default passwords

### **Development Workflow:**
- ✅ Work in feature branches
- ✅ Test in development environment
- ✅ Code review before deployment
- ✅ Document all changes
- ✅ Keep backup copies
- ❌ Never work directly on production
- ❌ Never skip testing

## 🆘 **Emergency Contacts**

### **If You Need Help:**
1. **Check the logs** - Look for error messages
2. **Review this guide** - Follow recovery procedures
3. **Check Git history** - Restore from previous commits
4. **Use bin system** - Recover moved files
5. **Create issue** - Document the problem

### **Critical Recovery Steps:**
1. **Stop the application** - Prevent further damage
2. **Assess the damage** - What files are missing?
3. **Check backups** - Look for recent backups
4. **Restore files** - Use appropriate recovery method
5. **Test functionality** - Ensure everything works
6. **Document incident** - Learn from mistakes

---

**Remember: It's better to have too many files than to lose critical ones!**

**When in doubt, move to bin instead of deleting!**
