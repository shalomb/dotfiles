# Cursor-Agent Observability System

## Overview

The cursor-agent container orchestration system includes comprehensive observability and logging capabilities to monitor execution, security events, and performance metrics.

## Components

### 1. **Logging System** (`cursor-agent-logger.sh`)

**Features:**
- **Structured Logging**: Timestamp, session ID, log level, component, message, and metadata
- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Component-based Logging**: Different components (SYSTEM, CONTAINER, SECURITY, etc.)
- **Performance Metrics**: Execution time, memory usage, CPU usage
- **Security Events**: Container start/stop, access attempts, security violations
- **File Operations**: Create, read, write, delete operations
- **Automatic Log Rotation**: Configurable cleanup of old logs

**Log Format:**
```
[2025-09-29 13:35:03.767] [1759145703-726363349] [INFO] [SYSTEM] Session started | session_id=1759145703-726363349 log_file=/path/to/log
```

**Components:**
- `SYSTEM`: System information, session management
- `CONTAINER`: Container execution, mount configuration
- `SECURITY`: Security events, access control
- `PERFORMANCE`: Performance metrics, timing
- `FILE`: File operations, I/O events
- `VALIDATION`: Input validation, error checking
- `CONFIG`: Configuration, setup
- `COMMAND`: Command execution, arguments
- `EXECUTION`: High-level execution flow
- `REPORT`: Summary reports, analysis

### 2. **Log Analysis** (`analyze-logs.sh`)

**Features:**
- **Log Summary**: Overview of all log files
- **Detailed Analysis**: Per-file analysis with statistics
- **Security Event Tracking**: Security-related events and patterns
- **Performance Analysis**: Execution times and resource usage
- **Container Execution Tracking**: Container start/stop events
- **Recent Activity**: Last 10 log entries for quick review

**Usage:**
```bash
./analyze-logs.sh                    # Show summary
./analyze-logs.sh -a                 # Analyze all logs
./analyze-logs.sh specific-log.log   # Analyze specific log
./analyze-logs.sh -s                 # Summary only
```

### 3. **Enhanced Orchestration** (`cursor-agent-container.sh`)

**Observability Features:**
- **Session Tracking**: Unique session IDs for each execution
- **Command Logging**: All container commands and arguments
- **Mount Configuration**: Detailed mount point logging
- **Execution Timing**: Start/end times and duration
- **Error Tracking**: Detailed error logging with context
- **Security Monitoring**: Container access and security events

## Log Files

### **Main Log File**
- **Location**: `logs/cursor-agent-YYYYMMDD-HHMMSS.log`
- **Content**: Complete execution log with all events
- **Format**: Structured JSON-like format with timestamps

### **Summary Reports**
- **Location**: `logs/summary-YYYYMMDD-HHMMSS.log`
- **Content**: High-level summary with statistics
- **Includes**: Session info, statistics, recent activity

### **Container Output**
- **Location**: `logs/container-output-YYYYMMDD-HHMMSS.log`
- **Content**: Full container output (when > 1000 bytes)
- **Purpose**: Detailed container execution logs

## Security Monitoring

### **Security Events Tracked:**
- `CONTAINER_START`: Container initialization
- `CONTAINER_SUCCESS`: Successful execution
- `CONTAINER_ERROR`: Execution failures
- `FILE_ACCESS`: File system access attempts
- `MOUNT_CONFIGURATION`: Volume mount setup
- `COMMAND_EXECUTION`: Commands being executed

### **Security Levels:**
- `INFO`: Normal operations
- `WARN`: Potential security concerns
- `ERROR`: Security violations
- `FATAL`: Critical security failures

## Performance Monitoring

### **Metrics Tracked:**
- **Execution Time**: Container start to completion
- **Memory Usage**: Container memory consumption
- **CPU Usage**: Container CPU utilization
- **File I/O**: Read/write operations
- **Network Activity**: Network requests (if applicable)

### **Performance Logging:**
```bash
log_performance "EXECUTION_TIME" "1.234" "seconds" "container_runtime"
log_performance "MEMORY_USAGE" "128" "MB" "container_runtime"
log_performance "CPU_USAGE" "45.6" "percent" "container_runtime"
```

## Configuration

### **Environment Variables:**
- `LOG_LEVEL`: Set minimum log level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=FATAL)
- `LOG_CLEANUP_DAYS`: Days to keep logs (default: 7)

### **Log Levels:**
- `DEBUG` (0): Detailed debugging information
- `INFO` (1): General information (default)
- `WARN` (2): Warning messages
- `ERROR` (3): Error conditions
- `FATAL` (4): Fatal errors

## Usage Examples

### **Basic Usage:**
```bash
# Run with default logging
./cursor-agent-container.sh "analyze this codebase"

# Run with debug logging
LOG_LEVEL=0 ./cursor-agent-container.sh "analyze this codebase"

# Run with custom log cleanup
LOG_CLEANUP_DAYS=30 ./cursor-agent-container.sh "analyze this codebase"
```

### **Log Analysis:**
```bash
# Quick summary
./analyze-logs.sh

# Detailed analysis of all logs
./analyze-logs.sh -a

# Analyze specific log file
./analyze-logs.sh logs/cursor-agent-20250929-133503.log
```

### **Log Management:**
```bash
# Initialize logging system
./cursor-agent-logger.sh init

# Create summary report
./cursor-agent-logger.sh summary

# Clean up old logs
./cursor-agent-logger.sh cleanup
```

## Log Review Workflow

### **1. Quick Review:**
```bash
./analyze-logs.sh -s
```

### **2. Detailed Analysis:**
```bash
./analyze-logs.sh -a
```

### **3. Security Review:**
```bash
grep "\[SECURITY\]" logs/*.log
```

### **4. Performance Review:**
```bash
grep "\[PERFORMANCE\]" logs/*.log
```

### **5. Error Analysis:**
```bash
grep "\[ERROR\]" logs/*.log
```

## Integration with Container System

The observability system is fully integrated with the cursor-agent container orchestration:

1. **Automatic Logging**: All container operations are automatically logged
2. **Session Tracking**: Each execution gets a unique session ID
3. **Security Monitoring**: All security-relevant events are tracked
4. **Performance Metrics**: Execution times and resource usage are recorded
5. **Error Handling**: Detailed error logging with context

## Benefits

### **Security:**
- Complete audit trail of all operations
- Security event tracking and alerting
- Container access monitoring
- File system access logging

### **Debugging:**
- Detailed execution logs
- Performance metrics
- Error context and stack traces
- Container output capture

### **Monitoring:**
- Real-time log viewing
- Performance trend analysis
- Security event patterns
- Resource usage tracking

### **Compliance:**
- Structured logging for audit requirements
- Immutable log files
- Complete operation history
- Security event documentation

## Future Enhancements

### **Planned Features:**
- **Real-time Monitoring**: Live log streaming
- **Alerting**: Automated alerts for security events
- **Metrics Dashboard**: Web-based log analysis
- **Log Aggregation**: Centralized log collection
- **Machine Learning**: Anomaly detection in logs

The observability system provides comprehensive monitoring and logging capabilities for the cursor-agent container orchestration system, enabling security monitoring, performance analysis, and operational debugging.