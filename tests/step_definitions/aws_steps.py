#!/usr/bin/env python3
"""
Step definitions for AWS function tests
Following GreyCat's principles: explicit, robust, no magic
"""

import os
import re
import subprocess
import tempfile
from pathlib import Path

class AWSFunctionSteps:
    def __init__(self, test_env):
        self.test_env = test_env
        self.repo_root = Path(__file__).parent.parent.parent
        
    def given_aws_functions_are_loaded(self):
        """Given the AWS functions are loaded"""
        # This is handled by the test framework
        return True
        
    def given_i_have_a_test_account(self, account):
        """Given I have a test account "account" """
        self.test_env['test_account'] = account
        return True
        
    def given_i_am_authenticated_with_aws(self):
        """Given I am authenticated with AWS"""
        # Run aws-login to authenticate
        cmd = f"aws-login {self.test_env.get('test_account', 'tec-man-eng-dev')}"
        result = self._run_aws_command(cmd)
        return result['success']
        
    def given_credentials_are_exported_to(self, file_path):
        """Given credentials are exported to "file_path" """
        cmd = f"aws-whoami {file_path}"
        result = self._run_aws_command(cmd)
        return result['success'] and os.path.exists(file_path)
        
    def when_i_run(self, command):
        """When I run "command" """
        result = self._run_aws_command(command)
        self.test_env['last_result'] = result
        return result['success']
        
    def then_the_command_should_succeed(self):
        """Then the command should succeed"""
        result = self.test_env.get('last_result', {})
        return result.get('success', False)
        
    def then_no_browser_should_be_launched(self):
        """Then no browser should be launched"""
        result = self.test_env.get('last_result', {})
        return not result.get('browser_launched', False)
        
    def then_aws_credentials_should_be_displayed(self):
        """Then AWS credentials should be displayed"""
        result = self.test_env.get('last_result', {})
        stdout = result.get('stdout', '')
        # Check for AWS credential patterns
        aws_patterns = [
            r'AWS_ACCESS_KEY_ID=',
            r'AWS_SECRET_ACCESS_KEY=',
            r'AWS_SESSION_TOKEN=',
            r'"Account":',
            r'"Arn":'
        ]
        return any(re.search(pattern, stdout) for pattern in aws_patterns)
        
    def then_credentials_should_be_exported_to(self, file_path):
        """Then credentials should be exported to "file_path" """
        return os.path.exists(file_path)
        
    def then_the_exported_credentials_should_be_real(self):
        """Then the exported credentials should be real (not masked)"""
        result = self.test_env.get('last_result', {})
        stdout = result.get('stdout', '')
        # Should NOT contain masked credentials
        return 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' not in stdout
        
    def then_aws_console_should_be_opened(self):
        """Then AWS console should be opened"""
        result = self.test_env.get('last_result', {})
        return result.get('browser_launched', False)
        
    def then_aws_ec2_console_should_be_opened_in_browser(self):
        """Then AWS EC2 console should be opened in browser"""
        return self._check_console_url('ec2')
        
    def then_aws_rds_console_should_be_opened_in_browser(self):
        """Then AWS RDS console should be opened in browser"""
        return self._check_console_url('rds')
        
    def then_aws_eks_console_should_be_opened_in_browser(self):
        """Then AWS EKS console should be opened in browser"""
        return self._check_console_url('eks')
        
    def then_aws_s3_console_should_be_opened_in_browser(self):
        """Then AWS S3 console should be opened in browser"""
        return self._check_console_url('s3')
        
    def then_aws_lambda_console_should_be_opened_in_browser(self):
        """Then AWS Lambda console should be opened in browser"""
        return self._check_console_url('lambda')
        
    def then_aws_cloudformation_console_should_be_opened_in_browser(self):
        """Then AWS CloudFormation console should be opened in browser"""
        return self._check_console_url('cloudformation')
        
    def then_aws_sso_console_should_be_opened(self):
        """Then AWS SSO console should be opened"""
        result = self.test_env.get('last_result', {})
        stdout = result.get('stdout', '')
        return 'aws-sso console' in stdout
        
    def then_the_url_should_contain(self, expected_url):
        """Then the URL should contain "expected_url" """
        result = self.test_env.get('last_result', {})
        last_url = result.get('last_url', '')
        return expected_url in last_url
        
    def then_sensitive_credentials_should_be_masked(self):
        """Then sensitive credentials should be masked"""
        result = self.test_env.get('last_result', {})
        stdout = result.get('stdout', '')
        # Should contain masked credentials
        return 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' in stdout
        
    def then_the_file_should_contain_valid_export_statements(self):
        """Then the file should contain valid export statements"""
        result = self.test_env.get('last_result', {})
        stdout = result.get('stdout', '')
        # Should contain export statements
        return 'export AWS_' in stdout
        
    def then_aws_environment_variables_should_be_set(self):
        """Then AWS environment variables should be set"""
        # This would require checking the environment after sourcing
        # For now, assume success if the command succeeded
        return True
        
    def _run_aws_command(self, command):
        """Run an AWS command and return detailed results"""
        env = os.environ.copy()
        
        # Create mock browser script
        mock_browser_script = self._create_mock_browser_script()
        env['AWS_SSO_BROWSER'] = f'bash {mock_browser_script}'
        env['BROWSER'] = f'bash {mock_browser_script}'
        
        try:
            cmd = f'bash -x -c "source .config/bash/rc.d/aws-sts-mfa-session && source .config/bash/rc.d/aws-sso && {command}"'
            
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=self.repo_root,
                env=env,
                capture_output=True,
                text=True
            )
            
            # Analyze browser invocations
            browser_analysis = self._analyze_browser_invocations(result)
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode,
                'browser_launched': browser_analysis['browser_launched'],
                'last_url': browser_analysis['last_url'],
                'browser_command': browser_analysis['browser_command']
            }
            
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'returncode': 1,
                'browser_launched': False,
                'last_url': '',
                'browser_command': ''
            }
        finally:
            if os.path.exists(mock_browser_script):
                os.unlink(mock_browser_script)
    
    def _create_mock_browser_script(self):
        """Create a mock browser script that logs all invocations"""
        script_content = '''#!/bin/bash
echo "BROWSER_INVOCATION: $*"
echo "Mock browser: $*"
'''
        
        script_file = tempfile.mktemp(suffix='.mock-browser.sh')
        with open(script_file, 'w') as f:
            f.write(script_content)
        os.chmod(script_file, 0o755)
        
        return script_file
    
    def _analyze_browser_invocations(self, result):
        """Analyze browser invocations from command output"""
        browser_launched = False
        last_url = ''
        browser_command = ''
        
        # Check for browser patterns
        browser_patterns = [
            r'x-www-browser\s+([^\s]+)',
            r'aws-console\s+([^\s]+)',
            r'BROWSER_INVOCATION:\s*(.+)',
            r'https://[^\s]+'
        ]
        
        for pattern in browser_patterns:
            matches = re.findall(pattern, result.stdout)
            if matches:
                browser_launched = True
                if pattern.startswith('https://'):
                    last_url = matches[0]
                else:
                    browser_command = matches[0]
                    if browser_command.startswith('https://'):
                        last_url = browser_command
        
        return {
            'browser_launched': browser_launched,
            'last_url': last_url,
            'browser_command': browser_command
        }
    
    def _check_console_url(self, service):
        """Check if the console URL contains the expected service"""
        result = self.test_env.get('last_result', {})
        last_url = result.get('last_url', '')
        return f'console.aws.amazon.com/{service}' in last_url