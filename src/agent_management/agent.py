#!/usr/bin/env python3
"""
Unified Agent Management System
Keychain-inspired architecture for SSH/GPG agent management
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
import logging


class AgentManager:
    """Unified agent management system following keychain principles."""
    
    def __init__(self):
        """Initialize the agent manager with XDG-compliant paths."""
        self.runtime_dir = Path(os.environ.get('XDG_RUNTIME_DIR', f'/run/user/{os.getuid()}'))
        self.state_dir = Path(os.environ.get('XDG_STATE_HOME', os.path.expanduser('~/.local/state')))
        self.config_dir = Path(os.environ.get('XDG_CONFIG_HOME', os.path.expanduser('~/.config')))
        
        # Agent-specific directories
        self.agents_runtime = self.runtime_dir / 'agents'
        self.agents_state = self.state_dir / 'agents'
        self.agents_config = self.config_dir / 'agents'
        
        # Ensure directories exist
        self.agents_runtime.mkdir(parents=True, exist_ok=True)
        self.agents_state.mkdir(parents=True, exist_ok=True)
        (self.agents_state / 'logs').mkdir(parents=True, exist_ok=True)
        self.agents_config.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self.setup_logging()
        
        # Context detection
        self.context = self.detect_context()
    
    def setup_logging(self):
        """Setup logging for the agent manager."""
        log_file = self.agents_state / 'logs' / 'agent-manager.log'
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stderr)
            ]
        )
        self.logger = logging.getLogger('agent_manager')
    
    def detect_context(self) -> str:
        """Detect the current shell context."""
        if os.environ.get('SSH_CLIENT') or os.environ.get('SSH_TTY'):
            return 'ssh'
        elif os.environ.get('TMUX'):
            return 'tmux'
        elif os.environ.get('CURSOR_AGENT'):
            return 'cursor-agent'
        elif sys.stdin.isatty():
            return 'interactive'
        else:
            return 'non-interactive'
    
    def init(self) -> bool:
        """Initialize agents for the current context."""
        self.logger.info(f"Initializing agents for context: {self.context}")
        
        success = True
        
        # Initialize SSH agent
        if not self.init_ssh_agent():
            self.logger.warning("Failed to initialize SSH agent")
            success = False
        
        # Initialize GPG agent
        if not self.init_gpg_agent():
            self.logger.warning("Failed to initialize GPG agent")
            success = False
        
        # Share agent state
        self.share_agent_state()
        
        return success
    
    def init_ssh_agent(self) -> bool:
        """Initialize SSH agent."""
        self.logger.info("Initializing SSH agent")
        
        # Check if GPG agent provides SSH functionality
        if self.check_gpg_ssh_socket():
            return True
        
        # Check existing SSH agent
        if self.check_ssh_agent():
            return True
        
        # Skip in SSH context to avoid clobbering forwarded agent
        if self.context == 'ssh':
            self.logger.info("Skipping SSH agent initialization in SSH context")
            return False
        
        # Start new SSH agent
        return self.start_ssh_agent()
    
    def init_gpg_agent(self) -> bool:
        """Initialize GPG agent."""
        self.logger.info("Initializing GPG agent")
        
        # Check existing GPG agent
        if self.check_gpg_agent():
            # Test if GPG signing works (keys unlocked)
            if self.test_gpg_signing():
                return True
            else:
                self.logger.info("GPG agent running but keys locked, attempting unlock")
                if self.unlock_gpg_agent():
                    return True
        
        # Start new GPG agent
        if self.start_gpg_agent():
            # Try to unlock after starting
            self.unlock_gpg_agent()
            return self.test_gpg_signing()
        
        return False
    
    def check_ssh_agent(self) -> bool:
        """Check if SSH agent is working."""
        ssh_auth_sock = os.environ.get('SSH_AUTH_SOCK')
        if not ssh_auth_sock or not os.path.exists(ssh_auth_sock):
            return False
        
        try:
            result = subprocess.run(['ssh-add', '-l'], 
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def check_gpg_agent(self) -> bool:
        """Check if GPG agent is working."""
        try:
            result = subprocess.run(['gpg-connect-agent', 'keyinfo --list', '/bye'], 
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def test_gpg_signing(self) -> bool:
        """Test if GPG signing works (keys unlocked)."""
        try:
            result = subprocess.run(['gpg', '--pinentry-mode', 'loopback', '--sign', '--batch', '--yes'], 
                                  input='test\n', capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def unlock_gpg_agent(self) -> bool:
        """Attempt to unlock GPG agent using loopback mode."""
        try:
            # Try to unlock using loopback mode
            result = subprocess.run(['gpg', '--pinentry-mode', 'loopback', '--sign', '--batch', '--yes'], 
                                  input='test\n', capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def check_gpg_ssh_socket(self) -> bool:
        """Check if GPG agent provides SSH functionality."""
        try:
            result = subprocess.run(['gpgconf', '--list-dirs', 'agent-ssh-socket'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode != 0:
                return False
            
            ssh_socket = result.stdout.strip()
            if not ssh_socket or not os.path.exists(ssh_socket):
                return False
            
            # Test if GPG agent's SSH socket works
            env = os.environ.copy()
            env['SSH_AUTH_SOCK'] = ssh_socket
            
            test_result = subprocess.run(['ssh-add', '-l'], 
                                       capture_output=True, text=True, timeout=5, env=env)
            if test_result.returncode == 0:
                os.environ['SSH_AUTH_SOCK'] = ssh_socket
                self.logger.info("Using GPG agent's SSH functionality")
                return True
            
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return False
    
    def start_ssh_agent(self) -> bool:
        """Start a new SSH agent."""
        try:
            result = subprocess.run(['ssh-agent', '-s'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return False
            
            # Parse agent output
            lines = result.stdout.strip().split('\n')
            ssh_agent_pid = None
            ssh_auth_sock = None
            
            for line in lines:
                if line.startswith('SSH_AGENT_PID='):
                    ssh_agent_pid = line.split('=', 1)[1].rstrip(';')
                elif line.startswith('SSH_AUTH_SOCK='):
                    ssh_auth_sock = line.split('=', 1)[1].rstrip(';')
            
            if ssh_agent_pid and ssh_auth_sock:
                os.environ['SSH_AGENT_PID'] = ssh_agent_pid
                os.environ['SSH_AUTH_SOCK'] = ssh_auth_sock
                
                # Save agent info
                self.save_ssh_agent_info(ssh_agent_pid, ssh_auth_sock)
                
                self.logger.info(f"Started SSH agent: PID={ssh_agent_pid}")
                return True
            
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            self.logger.error(f"Failed to start SSH agent: {e}")
        
        return False
    
    def start_gpg_agent(self) -> bool:
        """Start a new GPG agent."""
        try:
            # Set GPG_TTY
            gpg_tty = os.environ.get('GPG_TTY', os.ttyname(sys.stdin.fileno()) if sys.stdin.isatty() else '')
            os.environ['GPG_TTY'] = gpg_tty
            
            # Start GPG agent
            result = subprocess.run(['gpg-agent', '--daemon', '--enable-ssh-support'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return False
            
            time.sleep(1)  # Give agent time to start
            
            # Get agent info
            socket_result = subprocess.run(['gpgconf', '--list-dirs', 'agent-socket'], 
                                         capture_output=True, text=True, timeout=5)
            if socket_result.returncode != 0:
                return False
            
            socket = socket_result.stdout.strip()
            if socket and os.path.exists(socket):
                os.environ['GPG_AGENT_INFO'] = f"{socket}:0:1"
                
                # Save agent info
                self.save_gpg_agent_info(socket, gpg_tty)
                
                self.logger.info(f"Started GPG agent: socket={socket}")
                return True
            
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            self.logger.error(f"Failed to start GPG agent: {e}")
        
        return False
    
    def save_ssh_agent_info(self, pid: str, socket: str):
        """Save SSH agent information to state files."""
        # Save to runtime directory
        pid_file = self.agents_runtime / 'ssh-agent.pid'
        sock_file = self.agents_runtime / 'ssh-agent.sock'
        
        pid_file.write_text(pid)
        sock_file.write_text(socket)
        
        # Save to state directory for persistence
        state_file = self.agents_state / 'ssh-agent.json'
        state_data = {
            'pid': pid,
            'socket': socket,
            'timestamp': time.time(),
            'context': self.context
        }
        state_file.write_text(json.dumps(state_data, indent=2))
    
    def save_gpg_agent_info(self, socket: str, tty: str):
        """Save GPG agent information to state files."""
        # Save to runtime directory
        sock_file = self.agents_runtime / 'gpg-agent.sock'
        sock_file.write_text(socket)
        
        # Save to state directory for persistence
        state_file = self.agents_state / 'gpg-agent.json'
        state_data = {
            'socket': socket,
            'tty': tty,
            'timestamp': time.time(),
            'context': self.context
        }
        state_file.write_text(json.dumps(state_data, indent=2))
    
    def share_agent_state(self):
        """Share agent state with other shells."""
        context_file = self.agents_state / 'context.json'
        context_data = {
            'context': self.context,
            'timestamp': time.time(),
            'ssh_auth_sock': os.environ.get('SSH_AUTH_SOCK'),
            'gpg_agent_info': os.environ.get('GPG_AGENT_INFO'),
            'gpg_tty': os.environ.get('GPG_TTY')
        }
        context_file.write_text(json.dumps(context_data, indent=2))
    
    # SSH-specific methods
    def recover_ssh_agent(self) -> bool:
        """Recover SSH agent specifically."""
        self.logger.info("Recovering SSH agent")
        return self.init_ssh_agent()
    
    def restart_ssh_agent(self) -> bool:
        """Restart SSH agent specifically."""
        self.logger.info("Restarting SSH agent")
        self.cleanup_ssh_agent()
        return self.init_ssh_agent()
    
    def list_ssh_keys(self) -> List[str]:
        """List SSH keys."""
        try:
            result = subprocess.run(['ssh-add', '-l'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return [line.strip() for line in result.stdout.split('\n') if line.strip()]
            return []
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return []
    
    def cleanup_ssh_agent(self) -> bool:
        """Clean up SSH agent."""
        try:
            subprocess.run(['ssh-add', '-D'], capture_output=True, timeout=5)
            return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    # GPG-specific methods
    def recover_gpg_agent(self) -> bool:
        """Recover GPG agent specifically."""
        self.logger.info("Recovering GPG agent")
        return self.init_gpg_agent()
    
    def restart_gpg_agent(self) -> bool:
        """Restart GPG agent specifically."""
        self.logger.info("Restarting GPG agent")
        self.cleanup_gpg_agent()
        return self.init_gpg_agent()
    
    def list_gpg_keys(self) -> List[str]:
        """List GPG keys."""
        try:
            result = subprocess.run(['gpg', '--list-secret-keys', '--with-colons'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                keys = []
                for line in result.stdout.split('\n'):
                    if line.startswith('sec:'):
                        parts = line.split(':')
                        if len(parts) > 4:
                            key_id = parts[4]
                            if len(key_id) > 8:
                                keys.append(f"{key_id[-8:]} {parts[9] if len(parts) > 9 else 'Unknown'}")
                return keys
            return []
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return []
    
    def cleanup_gpg_agent(self) -> bool:
        """Clean up GPG agent."""
        try:
            subprocess.run(['gpg-connect-agent', 'killagent', '/bye'], 
                         capture_output=True, timeout=5)
            return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def status(self) -> Dict[str, any]:
        """Get current agent status."""
        status = {
            'context': self.context,
            'ssh': {
                'available': False,
                'socket': None,
                'keys': 0,
                'pid': None,
                'lifetime': None,
                'process_status': None
            },
            'gpg': {
                'available': False,
                'socket': None,
                'keys': 0,
                'pid': None,
                'lifetime': None,
                'process_status': None
            }
        }
        
        # Check SSH agent
        if self.check_ssh_agent():
            status['ssh']['available'] = True
            status['ssh']['socket'] = os.environ.get('SSH_AUTH_SOCK')
            
            # Get SSH agent PID and process info
            ssh_pid = os.environ.get('SSH_AGENT_PID')
            if ssh_pid:
                status['ssh']['pid'] = ssh_pid
                status['ssh']['process_status'] = self._check_process_status(ssh_pid)
                status['ssh']['lifetime'] = self._get_ssh_agent_lifetime()
            
            try:
                result = subprocess.run(['ssh-add', '-l'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    status['ssh']['keys'] = len(result.stdout.strip().split('\n'))
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass
        
        # Check GPG agent
        if self.check_gpg_agent():
            status['gpg']['available'] = True
            try:
                socket_result = subprocess.run(['gpgconf', '--list-dirs', 'agent-socket'], 
                                             capture_output=True, text=True, timeout=5)
                if socket_result.returncode == 0:
                    status['gpg']['socket'] = socket_result.stdout.strip()
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass
            
            # Get GPG agent PID and process info
            gpg_pid = self._get_gpg_agent_pid()
            if gpg_pid:
                status['gpg']['pid'] = gpg_pid
                status['gpg']['process_status'] = self._check_process_status(gpg_pid)
                status['gpg']['lifetime'] = self._get_gpg_agent_lifetime()
            
            try:
                result = subprocess.run(['gpg-connect-agent', 'keyinfo --list', '/bye'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    status['gpg']['keys'] = len([line for line in result.stdout.split('\n') if line.startswith('S')])
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass
        
        return status
    
    def restart(self) -> bool:
        """Restart all agents."""
        self.logger.info("Restarting agents")
        
        # Clean up existing agents
        self.cleanup()
        
        # Reinitialize
        return self.init()
    
    def recover(self) -> bool:
        """Recover from agent failures."""
        self.logger.info("Recovering from agent failures")
        
        # Check and restart SSH agent if needed
        if not self.check_ssh_agent():
            self.logger.info("SSH agent not working, restarting")
            if not self.init_ssh_agent():
                return False
        
        # Check and restart GPG agent if needed
        if not self.check_gpg_agent():
            self.logger.info("GPG agent not working, restarting")
            if not self.init_gpg_agent():
                return False
        
        return True
    
    def cleanup(self) -> bool:
        """Clean up dead agents."""
        self.logger.info("Cleaning up dead agents")
        
        # Clean up SSH agent
        ssh_pid_file = self.agents_runtime / 'ssh-agent.pid'
        if ssh_pid_file.exists():
            try:
                pid = int(ssh_pid_file.read_text().strip())
                # Check if process exists
                os.kill(pid, 0)
            except (ValueError, OSError):
                # Process doesn't exist, clean up
                ssh_pid_file.unlink(missing_ok=True)
                (self.agents_runtime / 'ssh-agent.sock').unlink(missing_ok=True)
                self.logger.info("Cleaned up dead SSH agent")
        
        # Clean up GPG agent
        gpg_sock_file = self.agents_runtime / 'gpg-agent.sock'
        if gpg_sock_file.exists():
            socket_path = gpg_sock_file.read_text().strip()
            if not os.path.exists(socket_path):
                gpg_sock_file.unlink(missing_ok=True)
                self.logger.info("Cleaned up dead GPG agent")
        
        return True
    
    def context_info(self) -> Dict[str, any]:
        """Get current context information."""
        return {
            'context': self.context,
            'is_interactive': sys.stdin.isatty(),
            'is_tmux': bool(os.environ.get('TMUX')),
            'is_ssh': bool(os.environ.get('SSH_CLIENT') or os.environ.get('SSH_TTY')),
            'is_cursor_agent': bool(os.environ.get('CURSOR_AGENT')),
            'tty': os.ttyname(sys.stdin.fileno()) if sys.stdin.isatty() else None
        }
    
    def _check_process_status(self, pid: str) -> str:
        """Check if a process is running using kill -0."""
        try:
            result = subprocess.run(['kill', '-0', pid], 
                                  capture_output=True, text=True, timeout=2)
            return "✅ Running" if result.returncode == 0 else "❌ Not running"
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return "❓ Unknown"
    
    def _get_ssh_agent_lifetime(self) -> str:
        """Get SSH agent lifetime information."""
        try:
            # Try to get lifetime from ssh-add -T
            result = subprocess.run(['ssh-add', '-T'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                # Parse lifetime from output (format: "Lifetime set to 3600 seconds")
                for line in result.stdout.split('\n'):
                    if 'Lifetime set to' in line:
                        seconds = line.split('Lifetime set to')[1].split('seconds')[0].strip()
                        return f"{seconds}s"
            return "❓ Unknown"
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return "❓ Unknown"
    
    def _get_gpg_agent_pid(self) -> str:
        """Get GPG agent PID."""
        try:
            result = subprocess.run(['gpgconf', '--list-dirs', 'agent-socket'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                socket_path = result.stdout.strip()
                # Try to get PID from socket file or process list
                result = subprocess.run(['pgrep', '-f', 'gpg-agent'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    pids = result.stdout.strip().split('\n')
                    return pids[0] if pids else None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return None
    
    def _get_gpg_agent_lifetime(self) -> str:
        """Get GPG agent lifetime information."""
        try:
            # Try to get cache TTL from gpgconf
            result = subprocess.run(['gpgconf', '--list-options', 'gpg-agent'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'default-cache-ttl' in line:
                        seconds = line.split('default-cache-ttl')[1].split()[0]
                        return f"{seconds}s"
                    elif 'max-cache-ttl' in line:
                        seconds = line.split('max-cache-ttl')[1].split()[0]
                        return f"{seconds}s"
            return "❓ Unknown"
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return "❓ Unknown"


def main():
    """Main entry point for the agent command."""
    parser = argparse.ArgumentParser(description='Unified agent management system')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Global commands
    subparsers.add_parser('init', help='Initialize agents for current context')
    subparsers.add_parser('status', help='Show agent status and health')
    subparsers.add_parser('restart', help='Restart agents')
    subparsers.add_parser('recover', help='Recover from agent failures')
    subparsers.add_parser('cleanup', help='Clean up dead agents')
    subparsers.add_parser('context', help='Show current context information')
    subparsers.add_parser('share', help='Share agent state with other shells')
    
    # SSH-specific commands
    ssh_parser = subparsers.add_parser('ssh', help='SSH agent management')
    ssh_subparsers = ssh_parser.add_subparsers(dest='ssh_command', help='SSH commands')
    ssh_subparsers.add_parser('status', help='Show SSH agent status')
    ssh_subparsers.add_parser('init', help='Initialize SSH agent')
    ssh_subparsers.add_parser('recover', help='Recover SSH agent')
    ssh_subparsers.add_parser('keys', help='List SSH keys')
    ssh_subparsers.add_parser('restart', help='Restart SSH agent')
    
    # GPG-specific commands
    gpg_parser = subparsers.add_parser('gpg', help='GPG agent management')
    gpg_subparsers = gpg_parser.add_subparsers(dest='gpg_command', help='GPG commands')
    gpg_subparsers.add_parser('status', help='Show GPG agent status')
    gpg_subparsers.add_parser('init', help='Initialize GPG agent')
    gpg_subparsers.add_parser('recover', help='Recover GPG agent')
    gpg_subparsers.add_parser('keys', help='List GPG keys')
    gpg_subparsers.add_parser('unlock', help='Unlock GPG keys')
    gpg_subparsers.add_parser('restart', help='Restart GPG agent')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    manager = AgentManager()
    
    try:
        # Global commands
        if args.command == 'init':
            success = manager.init()
            if success:
                print("✅ Agents initialized successfully")
            else:
                print("❌ Failed to initialize some agents")
                return 1
        
        elif args.command == 'status':
            status = manager.status()
            print(f"Context: {status['context']}")
            print(f"SSH: {'✅' if status['ssh']['available'] else '❌'} ({status['ssh']['keys']} keys)")
            print(f"GPG: {'✅' if status['gpg']['available'] else '❌'} ({status['gpg']['keys']} keys)")
        
        elif args.command == 'restart':
            success = manager.restart()
            if success:
                print("✅ Agents restarted successfully")
            else:
                print("❌ Failed to restart agents")
                return 1
        
        elif args.command == 'recover':
            success = manager.recover()
            if success:
                print("✅ Agents recovered successfully")
            else:
                print("❌ Failed to recover agents")
                return 1
        
        elif args.command == 'cleanup':
            success = manager.cleanup()
            if success:
                print("✅ Dead agents cleaned up")
            else:
                print("❌ Failed to cleanup agents")
                return 1
        
        elif args.command == 'context':
            context = manager.context_info()
            print(f"Context: {context['context']}")
            print(f"Interactive: {context['is_interactive']}")
            print(f"TMUX: {context['is_tmux']}")
            print(f"SSH: {context['is_ssh']}")
            print(f"Cursor Agent: {context['is_cursor_agent']}")
            print(f"TTY: {context['tty']}")
        
        elif args.command == 'share':
            manager.share_agent_state()
            print("✅ Agent state shared")
        
        # SSH-specific commands
        elif args.command == 'ssh':
            if not args.ssh_command:
                ssh_parser.print_help()
                return 1
            
            if args.ssh_command == 'status':
                status = manager.status()
                ssh_status = status['ssh']
                print(f"SSH Agent: {'✅' if ssh_status['available'] else '❌'}")
                print(f"Keys: {ssh_status['keys']}")
                if ssh_status['socket']:
                    print(f"Socket: {ssh_status['socket']}")
                if ssh_status['pid']:
                    print(f"PID: {ssh_status['pid']}")
                if ssh_status['process_status']:
                    print(f"Process: {ssh_status['process_status']}")
                if ssh_status['lifetime']:
                    print(f"Lifetime: {ssh_status['lifetime']}")
            
            elif args.ssh_command == 'init':
                success = manager.init_ssh_agent()
                if success:
                    print("✅ SSH agent initialized successfully")
                else:
                    print("❌ Failed to initialize SSH agent")
                    return 1
            
            elif args.ssh_command == 'recover':
                success = manager.recover_ssh_agent()
                if success:
                    print("✅ SSH agent recovered successfully")
                else:
                    print("❌ Failed to recover SSH agent")
                    return 1
            
            elif args.ssh_command == 'keys':
                keys = manager.list_ssh_keys()
                if keys:
                    print("SSH Keys:")
                    for key in keys:
                        print(f"  {key}")
                else:
                    print("No SSH keys found")
            
            elif args.ssh_command == 'restart':
                success = manager.restart_ssh_agent()
                if success:
                    print("✅ SSH agent restarted successfully")
                else:
                    print("❌ Failed to restart SSH agent")
                    return 1
        
        # GPG-specific commands
        elif args.command == 'gpg':
            if not args.gpg_command:
                gpg_parser.print_help()
                return 1
            
            if args.gpg_command == 'status':
                status = manager.status()
                gpg_status = status['gpg']
                print(f"GPG Agent: {'✅' if gpg_status['available'] else '❌'}")
                print(f"Keys: {gpg_status['keys']}")
                if gpg_status['socket']:
                    print(f"Socket: {gpg_status['socket']}")
                if gpg_status['pid']:
                    print(f"PID: {gpg_status['pid']}")
                if gpg_status['process_status']:
                    print(f"Process: {gpg_status['process_status']}")
                if gpg_status['lifetime']:
                    print(f"Lifetime: {gpg_status['lifetime']}")
            
            elif args.gpg_command == 'init':
                success = manager.init_gpg_agent()
                if success:
                    print("✅ GPG agent initialized successfully")
                else:
                    print("❌ Failed to initialize GPG agent")
                    return 1
            
            elif args.gpg_command == 'recover':
                success = manager.recover_gpg_agent()
                if success:
                    print("✅ GPG agent recovered successfully")
                else:
                    print("❌ Failed to recover GPG agent")
                    return 1
            
            elif args.gpg_command == 'keys':
                keys = manager.list_gpg_keys()
                if keys:
                    print("GPG Keys:")
                    for key in keys:
                        print(f"  {key}")
                else:
                    print("No GPG keys found")
            
            elif args.gpg_command == 'unlock':
                success = manager.unlock_gpg_agent()
                if success:
                    print("✅ GPG keys unlocked successfully")
                else:
                    print("❌ Failed to unlock GPG keys")
                    return 1
            
            elif args.gpg_command == 'restart':
                success = manager.restart_gpg_agent()
                if success:
                    print("✅ GPG agent restarted successfully")
                else:
                    print("❌ Failed to restart GPG agent")
                    return 1
        
        return 0
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())