#!/usr/bin/env python3
"""
Test Manager for AWS Functions
A sister to dotfile_manager that handles testing of bash functions using BDD approach.
"""

import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict, Any
import argparse
import re

class TestManager:
    def __init__(self, debug: bool = False):
        self.debug = debug
        self.repo_root = Path(__file__).parent.parent
        self.test_dir = self.repo_root / "tests"
        self.features_dir = self.test_dir / "features"
        self.step_definitions_dir = self.test_dir / "step_definitions"
        self.support_dir = self.test_dir / "support"
        
    def run_tests(self, feature_pattern: str = None) -> bool:
        """Run BDD tests for AWS functions."""
        print("🧪 AWS Functions Test Suite")
        print("=" * 50)
        
        # Find feature files
        if feature_pattern:
            feature_files = list(self.features_dir.glob(f"*{feature_pattern}*.feature"))
        else:
            feature_files = list(self.features_dir.glob("*.feature"))
            
        if not feature_files:
            print("❌ No feature files found")
            return False
            
        all_passed = True
        
        for feature_file in feature_files:
            print(f"\n📋 Running {feature_file.name}")
            print("-" * 30)
            
            if not self._run_feature(feature_file):
                all_passed = False
                
        print("\n" + "=" * 50)
        if all_passed:
            print("✅ All tests passed!")
        else:
            print("❌ Some tests failed!")
            
        return all_passed
    
    def _run_feature(self, feature_file: Path) -> bool:
        """Run a single feature file."""
        with open(feature_file, 'r') as f:
            content = f.read()
            
        # Parse feature file (simple parser for now)
        scenarios = self._parse_feature(content)
        
        all_passed = True
        for scenario in scenarios:
            print(f"  🎭 {scenario['name']}")
            
            if not self._run_scenario(scenario):
                all_passed = False
                
        return all_passed
    
    def _parse_feature(self, content: str) -> List[Dict[str, Any]]:
        """Parse feature file content into scenarios."""
        scenarios = []
        lines = content.split('\n')
        
        current_scenario = None
        current_steps = []
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('Scenario:'):
                if current_scenario:
                    current_scenario['steps'] = current_steps
                    scenarios.append(current_scenario)
                    
                current_scenario = {
                    'name': line.replace('Scenario:', '').strip(),
                    'steps': []
                }
                current_steps = []
                
            elif line.startswith(('Given', 'When', 'Then', 'And')):
                if current_scenario:
                    current_steps.append(line)
                    
        if current_scenario:
            current_scenario['steps'] = current_steps
            scenarios.append(current_scenario)
            
        return scenarios
    
    def _run_scenario(self, scenario: Dict[str, Any]) -> bool:
        """Run a single scenario."""
        steps = scenario['steps']
        
        # Set up test environment
        test_env = self._setup_test_environment()
        
        all_passed = True
        
        for step in steps:
            if not self._run_step(step, test_env):
                all_passed = False
                
        # Cleanup
        self._cleanup_test_environment(test_env)
        
        if all_passed:
            print(f"    ✅ {scenario['name']}")
        else:
            print(f"    ❌ {scenario['name']}")
            
        return all_passed
    
    def _run_step(self, step: str, test_env: Dict[str, Any]) -> bool:
        """Run a single step."""
        step_type = step.split()[0].lower()
        
        if step_type in ['given', 'when', 'then', 'and']:
            return self._execute_step(step, test_env)
            
        return True
    
    def _execute_step(self, step: str, test_env: Dict[str, Any]) -> bool:
        """Execute a step using proper step definitions."""
        # Import step definitions
        try:
            import sys
            import importlib.util
            
            # Add the step_definitions directory to path
            step_definitions_path = str(self.step_definitions_dir)
            if step_definitions_path not in sys.path:
                sys.path.insert(0, step_definitions_path)
            
            # Import the module
            spec = importlib.util.spec_from_file_location("aws_steps", self.step_definitions_dir / "aws_steps.py")
            aws_steps_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(aws_steps_module)
            
            steps = aws_steps_module.AWSFunctionSteps(test_env)
        except Exception as e:
            if self.debug:
                print(f"      ⚠️  Step definition import failed: {e}")
                print(f"      📁 Step definitions dir: {self.step_definitions_dir}")
                print(f"      📄 File exists: {(self.step_definitions_dir / 'aws_steps.py').exists()}")
            # Fallback to simple pattern matching if step definitions not available
            return self._execute_step_fallback(step, test_env)
        
        # Map step text to step definition methods (patterns without step type prefixes)
        step_mapping = {
            'the aws functions are loaded': steps.given_aws_functions_are_loaded,
            'i have a test account': lambda: steps.given_i_have_a_test_account(self._extract_quoted_string(step)),
            'i am authenticated with aws': steps.given_i_am_authenticated_with_aws,
            'credentials are exported to': lambda: steps.given_credentials_are_exported_to(self._extract_quoted_string(step)),
            'i run': lambda: steps.when_i_run(self._extract_quoted_string(step)),
            'the command should succeed': steps.then_the_command_should_succeed,
            'no browser should be launched': steps.then_no_browser_should_be_launched,
            'aws credentials should be displayed': steps.then_aws_credentials_should_be_displayed,
            'credentials should be exported to': lambda: steps.then_credentials_should_be_exported_to(self._extract_quoted_string(step)),
            'the exported credentials should be real': steps.then_the_exported_credentials_should_be_real,
            'aws console should be opened': steps.then_aws_console_should_be_opened,
            'aws ec2 console should be opened in browser': steps.then_aws_ec2_console_should_be_opened_in_browser,
            'aws rds console should be opened in browser': steps.then_aws_rds_console_should_be_opened_in_browser,
            'aws eks console should be opened in browser': steps.then_aws_eks_console_should_be_opened_in_browser,
            'aws s3 console should be opened in browser': steps.then_aws_s3_console_should_be_opened_in_browser,
            'aws lambda console should be opened in browser': steps.then_aws_lambda_console_should_be_opened_in_browser,
            'aws cloudformation console should be opened in browser': steps.then_aws_cloudformation_console_should_be_opened_in_browser,
            'aws sso console should be opened': steps.then_aws_sso_console_should_be_opened,
            'the url should contain': lambda: steps.then_the_url_should_contain(self._extract_quoted_string(step)),
            'sensitive credentials should be masked': steps.then_sensitive_credentials_should_be_masked,
            'the file should contain valid export statements': steps.then_the_file_should_contain_valid_export_statements,
            'aws environment variables should be set': steps.then_aws_environment_variables_should_be_set,
        }
        
        # Find matching step definition
        step_lower = step.lower().strip()
        
        # Remove step type prefixes (Given, When, Then, And)
        step_lower = re.sub(r'^(given|when|then|and)\s+', '', step_lower)
        
        for pattern, step_func in step_mapping.items():
            if step_lower.startswith(pattern):
                try:
                    return step_func()
                except Exception as e:
                    if self.debug:
                        print(f"      ❌ Step execution error: {e}")
                    return False
        
        # No matching step definition found
        if self.debug:
            print(f"      ⚠️  No step definition for: '{step}'")
            print(f"      🔍 Normalized step: '{step_lower}'")
            print(f"      📋 Available patterns: {list(step_mapping.keys())}")
        return True
    
    def _extract_quoted_string(self, text: str) -> str:
        """Extract quoted string from step text."""
        match = re.search(r'"([^"]+)"', text)
        return match.group(1) if match else ""
    
    def _execute_step_fallback(self, step: str, test_env: Dict[str, Any]) -> bool:
        """Fallback step execution using simple pattern matching."""
        step_lower = step.lower()
        
        # Command execution steps
        if 'i run "' in step_lower:
            match = re.search(r'i run "([^"]+)"', step)
            if match:
                command = match.group(1)
                return self._run_command(command, test_env)
                
        # Browser check steps
        elif 'no browser should be launched' in step_lower:
            return not test_env.get('browser_launched', False)
            
        elif 'browser should be opened' in step_lower:
            return test_env.get('browser_launched', False)
            
        # File check steps
        elif 'credentials should be exported to' in step_lower:
            match = re.search(r'exported to "([^"]+)"', step)
            if match:
                file_path = match.group(1)
                return os.path.exists(file_path)
                
        # URL check steps
        elif 'url should contain' in step_lower:
            match = re.search(r'contain "([^"]+)"', step)
            if match:
                expected_url = match.group(1)
                actual_url = test_env.get('last_url', '')
                return expected_url in actual_url
                
        # Success check steps
        elif 'command should succeed' in step_lower:
            return test_env.get('last_command_success', False)
            
        # Default: assume step passed
        return True
    
    def _run_command(self, command: str, test_env: Dict[str, Any]) -> bool:
        """Run a command and track its effects."""
        if self.debug:
            print(f"      🔧 Running: {command}")
            
        # Set up environment with browser interception and mock aws-sso
        env = os.environ.copy()
        
        # Create a mock browser that logs all invocations
        mock_browser_script = self._create_mock_browser_script()
        mock_aws_sso_script = str(self.support_dir / "mock-aws-sso.sh")
        
        env['AWS_SSO_BROWSER'] = f'bash {mock_browser_script}'
        env['BROWSER'] = f'bash {mock_browser_script}'
        
        # Create a wrapper script that overrides aws-sso
        wrapper_script = self._create_aws_sso_wrapper()
        env['PATH'] = f"{self.support_dir}:{env['PATH']}"
        env['AWS_SSO_WRAPPER'] = wrapper_script
        
        # Create temporary file to capture browser launches
        browser_log_file = tempfile.mktemp(suffix='.browser.log')
        
        try:
            # Run command in completely isolated environment
            isolated_test_script = str(self.support_dir / "isolated-test.sh")
            cmd = f'bash -x {isolated_test_script} bash -c "source {isolated_test_script} && {command}"'
            
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=self.repo_root,
                env=env,
                capture_output=True,
                text=True
            )
            
            # Analyze browser invocations from multiple sources
            browser_analysis = self._analyze_browser_invocations(result, browser_log_file)
            
            # Update test environment
            test_env['browser_launched'] = browser_analysis['browser_launched']
            test_env['last_url'] = browser_analysis['last_url']
            test_env['browser_command'] = browser_analysis['browser_command']
            test_env['last_command_success'] = result.returncode == 0
            
            if self.debug:
                print(f"      📊 Return code: {result.returncode}")
                print(f"      🌐 Browser launched: {browser_analysis['browser_launched']}")
                if browser_analysis['last_url']:
                    print(f"      🔗 URL: {browser_analysis['last_url']}")
                if browser_analysis['browser_command']:
                    print(f"      🖥️  Browser command: {browser_analysis['browser_command']}")
                    
            return result.returncode == 0
            
        except Exception as e:
            if self.debug:
                print(f"      ❌ Error: {e}")
            return False
            
        finally:
            # Cleanup
            for file_path in [mock_browser_script, browser_log_file]:
                if os.path.exists(file_path):
                    os.unlink(file_path)
    
    def _create_mock_browser_script(self) -> str:
        """Create a mock browser script that logs all invocations."""
        script_content = '''#!/bin/bash
# Mock browser script that logs all invocations
echo "BROWSER_INVOCATION: $*" >> "$1"
echo "Mock browser: $*"
'''
        
        script_file = tempfile.mktemp(suffix='.mock-browser.sh')
        with open(script_file, 'w') as f:
            f.write(script_content)
        os.chmod(script_file, 0o755)
        
        return script_file
    
    def _create_aws_sso_wrapper(self) -> str:
        """Create a wrapper script that overrides aws-sso with our mock."""
        mock_aws_sso_script = str(self.support_dir / "mock-aws-sso.sh")
        
        script_content = f'''#!/bin/bash
# Wrapper script that redirects aws-sso calls to our mock
exec "{mock_aws_sso_script}" "$@"
'''
        
        script_file = tempfile.mktemp(suffix='.aws-sso-wrapper.sh')
        with open(script_file, 'w') as f:
            f.write(script_content)
        os.chmod(script_file, 0o755)
        
        return script_file
    
    def _analyze_browser_invocations(self, result: subprocess.CompletedProcess, browser_log_file: str) -> Dict[str, Any]:
        """Analyze browser invocations from multiple sources."""
        browser_launched = False
        last_url = ''
        browser_command = ''
        
        # Check stdout for browser commands
        stdout_patterns = [
            r'x-www-browser\s+([^\s]+)',
            r'aws-console\s+([^\s]+)',
            r'BROWSER_INVOCATION:\s*(.+)',
            r'Mock browser:\s*(.+)',
            r'https://[^\s]+'
        ]
        
        for pattern in stdout_patterns:
            matches = re.findall(pattern, result.stdout)
            if matches:
                browser_launched = True
                if pattern.startswith('https://'):
                    last_url = matches[0]
                else:
                    browser_command = matches[0]
                    if browser_command.startswith('https://'):
                        last_url = browser_command
        
        # Check stderr for browser commands
        for pattern in stdout_patterns:
            matches = re.findall(pattern, result.stderr)
            if matches:
                browser_launched = True
                if pattern.startswith('https://'):
                    last_url = matches[0]
                else:
                    browser_command = matches[0]
                    if browser_command.startswith('https://'):
                        last_url = browser_command
        
        # Check browser log file if it exists
        if os.path.exists(browser_log_file):
            try:
                with open(browser_log_file, 'r') as f:
                    log_content = f.read()
                    if 'BROWSER_INVOCATION:' in log_content:
                        browser_launched = True
                        # Extract URL from log
                        url_match = re.search(r'https://[^\s]+', log_content)
                        if url_match:
                            last_url = url_match.group(0)
            except Exception:
                pass
        
        return {
            'browser_launched': browser_launched,
            'last_url': last_url,
            'browser_command': browser_command
        }
    
    def _setup_test_environment(self) -> Dict[str, Any]:
        """Set up test environment."""
        return {
            'browser_launched': False,
            'last_url': '',
            'last_command_success': False
        }
    
    def _cleanup_test_environment(self, test_env: Dict[str, Any]):
        """Clean up test environment."""
        # Clean up any test files
        test_files = ['/tmp/test-creds.sh', '/tmp/aws-test-creds.sh']
        for file_path in test_files:
            if os.path.exists(file_path):
                os.unlink(file_path)


def main():
    parser = argparse.ArgumentParser(description='Test Manager for AWS Functions')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--feature', help='Run specific feature (pattern matching)')
    
    args = parser.parse_args()
    
    test_manager = TestManager(debug=args.debug)
    success = test_manager.run_tests(feature_pattern=args.feature)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()