import log from "npmlog";
import path from "path";

// mocked modules
import ChildProcessUtilities from "../src/ChildProcessUtilities";
import GitUtilities from "../src/GitUtilities";

// helpers
import callsBack from "./helpers/callsBack";
import initFixture from "./helpers/initFixture";
import yargsRunner from "./helpers/yargsRunner";

// file under test
import * as commandModule from "../src/commands/DiffCommand";

const run = yargsRunner(commandModule);

jest.mock("../src/ChildProcessUtilities");
jest.mock("../src/GitUtilities");

// silence logs
log.level = "silent";

describe("DiffCommand", () => {
  const callbackSuccess = callsBack(null, true);

  let testDir;

  beforeEach(() => initFixture("DiffCommand/basic").then((dir) => {
    testDir = dir;
    GitUtilities.isInitialized.mockImplementation(() => true);
    GitUtilities.hasCommit.mockImplementation(() => true);
  }));
  afterEach(() => jest.resetAllMocks());

  it("should diff everything from the first commit", () => {
    GitUtilities.getFirstCommit.mockImplementation(() => "beefcafe");
    ChildProcessUtilities.spawn.mockImplementation(callbackSuccess);

    return run(testDir)().then(() => {
      expect(ChildProcessUtilities.spawn).lastCalledWith(
        "git",
        [
          "diff",
          "beefcafe",
          "--color=auto",
        ],
        expect.objectContaining({
          cwd: testDir,
        }),
        expect.any(Function)
      );
    });
  });

  it("should diff everything from the most recent tag", () => {
    GitUtilities.hasTags.mockImplementation(() => true);
    GitUtilities.getLastTaggedCommit.mockImplementation(() => "cafedead");
    ChildProcessUtilities.spawn.mockImplementation(callbackSuccess);

    return run(testDir)().then(() => {
      expect(ChildProcessUtilities.spawn).lastCalledWith(
        "git",
        [
          "diff",
          "cafedead",
          "--color=auto",
        ],
        expect.objectContaining({
          cwd: testDir,
        }),
        expect.any(Function)
      );
    });
  });

  it("should diff a specific package", () => {
    GitUtilities.getFirstCommit.mockImplementation(() => "deadbeef");
    ChildProcessUtilities.spawn.mockImplementation(callbackSuccess);

    return run(testDir)(
      "package-1"
    ).then(() => {
      expect(ChildProcessUtilities.spawn).lastCalledWith(
        "git",
        [
          "diff",
          "deadbeef",
          "--color=auto",
          "--",
          path.join(testDir, "packages/package-1"),
        ],
        expect.objectContaining({
          cwd: testDir,
        }),
        expect.any(Function)
      );
    });
  });

  it("should error when attempting to diff a package that doesn't exist", () => {
    return run(testDir)(
      "missing"
    ).catch((err) => {
      expect(err.exitCode).toBe(1);
      expect(err.message).toBe("Package 'missing' does not exist.");
    });
  });

  it("should error when running in a repository without commits", () => {
    // override beforeEach mock
    GitUtilities.hasCommit.mockImplementation(() => false);

    return run(testDir)(
      "package-1"
    ).catch((err) => {
      expect(err.exitCode).toBe(1);
      expect(err.message).toBe("Can't diff. There are no commits in this repository, yet.");
    });
  });

  it("should error when git diff exits non-zero", () => {
    const err = new Error("An actual non-zero, not git diff pager SIGPIPE");
    err.code = 1;
    ChildProcessUtilities.spawn.mockImplementation(callsBack(err));

    return run(testDir)(
      "package-1"
    ).catch((err) => {
      expect(err.exitCode).toBe(1);
      expect(err.message).toBe("An actual non-zero, not git diff pager SIGPIPE");
    });
  });
});
