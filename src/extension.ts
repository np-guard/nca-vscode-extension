import * as vscode from 'vscode';
import {PythonShell, Options} from 'python-shell';

export function activate(context: vscode.ExtensionContext) {

	const nca_command = 'nca/nca_cli.py'
	const vscode = require('vscode');
	let outputChannel = vscode.window.createOutputChannel("NCA channel");

	let disposable = vscode.commands.registerCommand('nca.runNca', () => {

		// initialization
		const config = vscode.workspace.getConfiguration('nca');
		const nca_path = config.get('NCA Location');
		const python_path = config.get('Python Path');
		let yamls_path = config.get('YAML files path');
		const cmd_params = config.get('Parameters');
		const output_format = config.get('Output Format');
		const outfile_path = config.get('Output File');
		const graphfile_path = config.get('Graph File');

		// setup options object
		let options: Options = {
			mode: "text",
			pythonPath: python_path,
			scriptPath: nca_path,
			pythonOptions: ['-u'], // get print results in real-time
			args: [] as string[]
		};

		if (cmd_params !== ''){
			options.args = cmd_params.split(" ");
		}
		let orig_args = options.args;
		if (yamls_path === '') {
			// use the current project path
			if(vscode.workspace.workspaceFolders !== undefined) {
				yamls_path = vscode.workspace.workspaceFolders[0].uri.fsPath;
			} else {
				outputChannel.append('WARNING: Could not extract project path as default YAMLs path');
				outputChannel.show();
			}
		}
		if (!cmd_params.includes('--connectivity')) {
			options.args?.push("--connectivity", `${yamls_path}`);
		}
		if (!cmd_params.includes('--resource_list')) {
			options.args?.push("--resource_list", `${yamls_path}`);
		}
		options.args?.push("--output_format", output_format);

		// run nca
		outputChannel.clear();
		let shell = PythonShell.run(nca_command, options, function (err, results) {
			console.log('results: %s err: %s', results, err);
			let output = ''
			if (err) {
				outputChannel.append(err.message)
				outputChannel.show()
				return
			} else {
				outputChannel.append(results!.join("\n"))
				// create output file
				if (outfile_path) {
					// run again to create the output file
					options.args = orig_args;
					options.args?.push("--output_format", output_format);
					options.args?.push("--file_out", outfile_path);
					PythonShell.run(nca_command, options, function (err, results) {
						console.log('results: %s err: %s', results, err);
						if (err) {
							outputChannel.append(err.message)
						}
					});
				}

				// Show a graph
				if (graphfile_path) {
					// run again to create the graph file
					options.args = orig_args;
					options.args?.push("--output_format", 'jpg');
					options.args?.push("--file_out", graphfile_path);

					PythonShell.run(nca_command, options, function (err, results) {
						console.log('results: %s err: %s', results, err);
						if (err) {
							outputChannel.append(err.message)
						} else {
							// Open a image in the main area
							vscode.commands.executeCommand("vscode.open", vscode.Uri.file(graphfile_path));
						}
					});
				}
			}	
		});
		shell.on('error', function (err) {
			// handle stderr (a line of text from stderr)
			outputChannel.append('ERROR: Can not run Python (is the path accurate?): ' + err.message);
		});
		outputChannel.show();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
