// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {PythonShell} from 'python-shell';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Starting Python shell and running NCA');
	type modetype = 'text' | 'json' | 'binary' | undefined;

	let options = {
	  mode: "text" as modetype,
	  pythonPath: '',
	  scriptPath: '',
	  pythonOptions: ['-u'], // get print results in real-time
	  args: ['']
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
		const cmd_params = config.get('Parameters');
		const output_format = config.get('Output Format');
		const outfile_path = config.get('Output File');
		const graphfile_path = config.get('Graph File');

		// setup options object
		options.scriptPath = nca_path
		options.pythonPath = pythion_path,
		options.args = cmd_params.split(" ");
		let orig_args = options.args;
		options.args.push("--output_format", output_format);

		// run nca
		PythonShell.run('nca_cli.py', options, function (err, results) {

			console.log('results: %s err: %s', results, err);
            
			// prepare and show output results
			let newArrayOfStrings: string = results!.join("\n");
			outputChannel.clear();
			outputChannel.append(newArrayOfStrings);
			outputChannel.show();
		});
		
		// create output file
		if (outfile_path) {
			// run again to create the output file
			options.args = orig_args;
			options.args.push("--output_format", output_format);
			options.args.push("--file_out", outfile_path);

			PythonShell.run('nca_cli.py', options, function (err, results) {
				// results is an array consisting of messages collected during execution
				console.log('results: %s err: %s', results, err);
			});
		}

		// Show a graph
		if (graphfile_path) {
			// run again to create a dot file
			options.args = orig_args;
			options.args.push("--output_format", 'dot');
			const temp_outfile = graphfile_path+'.dot';
			options.args.push("--file_out", temp_outfile);

			PythonShell.run('nca_cli.py', options, function (err, results) {
				// results is an array consisting of messages collected during execution
				console.log('results: %s err: %s', results, err);

				const spawn = require('child_process').spawn;
				function convertDotToGif(dotFilePath: string, gifFilePath: string) {
					return new Promise((resolve, reject) => {
						const dot = spawn('dot', ['-Tgif', '-o', gifFilePath, dotFilePath]);
						dot.on('close', (exitCode: number) => {
							if (exitCode === 0) {
								resolve(0);
							} else {
								reject(`dot process exited with code ${exitCode}`);
							}
						});
					});
				}
				const dotFilePath = temp_outfile;
				const gifFilePath = graphfile_path;
				convertDotToGif(dotFilePath, gifFilePath)
					.then(() => {
						console.log(`Dot file converted to gif: ${gifFilePath}`);
						// Open a image in the main area
						vscode.commands.executeCommand("vscode.open", vscode.Uri.file(gifFilePath));
						
						// delete dot file
						const fs = require('fs');
						function deleteFile(filePath: string) {
							return new Promise((resolve, reject) => {
								fs.unlink(filePath, (error: any) => {
									if (error) {
										reject(error);
									} else {
										resolve(0);
									}
								});
							});
						}
						// Example usage
						const filePath = temp_outfile;
						deleteFile(filePath)
							.then(() => {
								console.log(`File deleted: ${filePath}`);
							})
							.catch((error) => {
								console.error(`Error deleting file: ${error}`);
							});
					
					})
					.catch((error) => {
						console.error(`Error converting dot file to gif: ${error}`);
					});


			});
		}


	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
