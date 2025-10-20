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
            return True
        
        # Start new GPG agent
        return self.start_gpg_agent()
    
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
    
    def status(self) -> Dict[str, any]:
        """Get current agent status."""
        status = {
            'context': self.context,
            'ssh': {
                'available': False,
                'socket': None,
                'keys': 0
            },
            'gpg': {
                'available': False,
                'socket': None,
                'keys': 0
            }
        }
        
        # Check SSH agent
        if self.check_ssh_agent():
            status['ssh']['available'] = True
            status['ssh']['socket'] = os.environ.get('SSH_AUTH_SOCK')
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


def main():
    """Main entry point for the agent command."""
    parser = argparse.ArgumentParser(description='Unified agent management system')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # init command
    subparsers.add_parser('init', help='Initialize agents for current context')
    
    # status command
    subparsers.add_parser('status', help='Show agent status and health')
    
    # restart command
    subparsers.add_parser('restart', help='Restart agents')
    
    # recover command
    subparsers.add_parser('recover', help='Recover from agent failures')
    
    # cleanup command
    subparsers.add_parser('cleanup', help='Clean up dead agents')
    
    # context command
    subparsers.add_parser('context', help='Show current context information')
    
    # share command
    subparsers.add_parser('share', help='Share agent state with other shells')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    manager = AgentManager()
    
    try:
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
        
        return 0
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())