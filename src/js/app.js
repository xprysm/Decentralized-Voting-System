const Web3 = require('web3');
const contract = require('@truffle/contract');
const votingArtifacts = require('../../build/contracts/Voting.json');
var VotingContract = contract(votingArtifacts);

window.App = {
  eventStart: async function () {
    if (window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      VotingContract.setProvider(window.ethereum);

      const accounts = await web3.eth.getAccounts();
      App.account = accounts[0];

      VotingContract.defaults({ from: App.account, gas: 6654755 });
      $("#accountAddress").html("Your Account: " + App.account);

      const instance = await VotingContract.deployed();
      const countCandidates = await instance.getCountCandidates();

      $(document).ready(function () {
        $('#addCandidate').click(async function () {
          const nameCandidate = $('#name').val();
          const partyCandidate = $('#party').val();
          await instance.addCandidate(nameCandidate, partyCandidate, { from: App.account });
        });

        $('#addDate').click(async function () {
          const startDate = Date.parse(document.getElementById("startDate").value) / 1000;
          const endDate = Date.parse(document.getElementById("endDate").value) / 1000;
          await instance.setDates(startDate, endDate, { from: App.account });
          console.log("Dates set successfully");
        });

        instance.getDates().then(function (result) {
          const startDate = new Date(result[0] * 1000);
          const endDate = new Date(result[1] * 1000);
          $("#dates").text(startDate.toDateString() + " - " + endDate.toDateString());
        }).catch(err => console.error("ERROR! " + err.message));
      });

      for (let i = 0; i < countCandidates; i++) {
        instance.getCandidate(i + 1).then(function (data) {
          const id = data[0];
          const name = data[1];
          const party = data[2];
          const voteCount = data[3];
          const viewCandidates = `
            <tr>
              <td><input class="form-check-input" type="radio" name="candidate" value="${id}" id=${id}> ${name}</td>
              <td>${party}</td>
              <td>${voteCount}</td>
            </tr>`;
          $("#boxCandidate").append(viewCandidates);
        });
      }

      instance.checkVote().then(function (voted) {
        if (!voted) {
          $("#voteButton").attr("disabled", false);
        }
      });

    } else {
      alert("Please install MetaMask!");
    }
  },

  vote: async function () {
    const candidateID = $("input[name='candidate']:checked").val();
    if (!candidateID) {
      $("#msg").html("<p>Please vote for a candidate.</p>");
      return;
    }

    console.log("Voting for candidate:", candidateID, "from:", App.account);

    try {
      const instance = await VotingContract.deployed();
      await instance.vote(parseInt(candidateID), { from: App.account });

      $("#voteButton").attr("disabled", true);
      $("#msg").html("<p>Voted</p>");
      window.location.reload(1);
    } catch (err) {
      console.error("Vote error:", err);
      $("#msg").html(`<p style="color:red;">Vote failed: ${err.message}</p>`);
    }
  }
};

window.addEventListener("load", function () {
  if (typeof web3 !== "undefined") {
    console.warn("Using web3 from MetaMask");
    window.eth = new Web3(window.ethereum);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:9545");
    window.eth = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }
  window.App.eventStart();
});
