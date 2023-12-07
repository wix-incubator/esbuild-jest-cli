class CustomReporter {
  onRunStart() {
    console.log('[custom reporter] onRunStart');
  }

  onRunComplete() {
    console.log('[custom reporter] onRunComplete');
  }
}

module.exports = CustomReporter;
