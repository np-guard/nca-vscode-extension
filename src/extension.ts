// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {PythonShell} from 'python-shell';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	type modetype = 'text' | 'json' | 'binary' | undefined;

	let options = {
	  mode: "text" as modetype,
	  pythonPath: '',
	  scriptPath: '',
	  pythonOptions: ['-u'], // get print results in real-time
	  args: [] as string[]
	};

	let outputChannel = vscode.window.createOutputChannel("NCA channel");

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('nca.runNca', () => {

		// initialization
		const vscode = require('vscode');
		const config = vscode.workspace.getConfiguration('nca');
		const nca_path = config.get('NCA Location');
		const pythion_path = config.get('Python path');
		let yamls_path = config.get('YAML files path');
		const cmd_params = config.get('Parameters');
		const output_format = config.get('Output Format');
		const outfile_path = config.get('Output File');
		const graphfile_path = config.get('Graph File');

		// setup options object
		options.scriptPath = nca_path;
		options.pythonPath = pythion_path;
		if (cmd_params == ''){
			options.args = []
		} else {
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
			options.args.push("--connectivity", `${yamls_path}`);
		}
		if (!cmd_params.includes('--resource_list')) {
			options.args.push("--resource_list", `${yamls_path}`);
		}
		options.args.push("--output_format", output_format);

		// run nca
		const nca_command = 'nca/nca_cli.py'
		PythonShell.run(nca_command, options, function (err, results) {

			console.log('results: %s err: %s', results, err);
			let output = ''
			if (err) {
				output = err.message
			} else {
				output = results!.join("\n")
			}	
			// prepare and show output results
			outputChannel.clear();
			outputChannel.append(output);
			outputChannel.show();
		});
		
		// create output file
		if (outfile_path) {
			// run again to create the output file
			options.args = orig_args;
			options.args.push("--output_format", output_format);
			options.args.push("--file_out", outfile_path);
			PythonShell.run(nca_command, options, function (err, results) {
				// results is an array consisting of messages collected during execution
				console.log('results: %s err: %s', results, err);
			});
		}

		// Show a graph
		if (graphfile_path) {
			// run again to create a dot file
			options.args = orig_args;
			options.args.push("--output_format", 'jpg');
			options.args.push("--file_out", graphfile_path);

			PythonShell.run(nca_command, options, function (err, results) {
				// results is an array consisting of messages collected during execution
				console.log('results: %s err: %s', results, err);
				// Open a image in the main area
				vscode.commands.executeCommand("vscode.open", vscode.Uri.file(graphfile_path));
			});
		}


	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
