import os

file_path = 'src/App.jsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Conflict 1 (already fixed, but let's be safe)
    if '<<<<<<< Updated upstream' in line and i < 150:
        continue
    if '=======' in line and i < 150:
        continue
    if '>>>>>>> Stashed changes' in line and i < 150:
        continue
        
    # Conflict 2 (Wallet)
    if '<<<<<<< Updated upstream' in line and 850 < i < 950:
        new_lines.append('    if (title === "Wallet" || title === "Survey Wallet" || title === "Referral Wallet") {\n')
        new_lines.append('      const balance = title === "Referral Wallet" ? (currentUser?.referral_wallet || 0) : (currentUser?.wallet_balance || 0);\n')
        new_lines.append('      const minWithdrawal = title === "Referral Wallet" ? 50 : (currentUser?.min_withdrawal || 100);\n')
        new_lines.append('      const handleWithdraw = async () => {\n')
        new_lines.append('        if (!withdrawalAmount || parseFloat(withdrawalAmount) < minWithdrawal) {\n')
        new_lines.append('          alert(`Minimum withdrawal amount is ₹${minWithdrawal}`);\n')
        new_lines.append('          return;\n')
        new_lines.append('        }\n')
        new_lines.append('        if (!API_BASE_URL) return;\n')
        new_lines.append('        const accessToken = localStorage.getItem("accessToken");\n')
        new_lines.append('        if (!accessToken) return;\n')
        new_lines.append('        try {\n')
        new_lines.append('          const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {\n')
        new_lines.append('            method: "POST",\n')
        new_lines.append('            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },\n')
        new_lines.append('            body: JSON.stringify({ amount: parseFloat(withdrawalAmount), walletType: title === "Referral Wallet" ? "referral" : "main" }),\n')
        new_lines.append('          });\n')
        new_lines.append('          if (response.ok) {\n')
        new_lines.append('            alert("Withdrawal request submitted successfully!");\n')
        new_lines.append('            setWithdrawalAmount("");\n')
        new_lines.append('            window.location.reload();\n')
        new_lines.append('          } else {\n')
        new_lines.append('            const error = await response.json().catch(() => ({}));\n')
        new_lines.append('            alert(error.message || "Failed to submit withdrawal");\n')
        new_lines.append('          }\n')
        new_lines.append('        } catch (error) {\n')
        new_lines.append('          console.error("Withdrawal error:", error);\n')
        new_lines.append('          alert("Failed to submit withdrawal");\n')
        new_lines.append('        }\n')
        new_lines.append('      };\n')
        continue
        
    if '=======' in line and 1000 < i < 1100:
        skip = True
        continue
    if '>>>>>>> Stashed changes' in line and 1050 < (i + 150): # Broad range for end
        if 'Stashed changes' in line and i > 1000:
            skip = False
            continue
            
    if not skip:
        # Also fix hardcoded 0 in GitHub UI
        if '0 = ₹ 0' in line and 900 < i < 1000:
             line = line.replace('0 = ₹ 0', '₹ {balance.toFixed(2)}')
        elif '₹ 0' in line and 950 < i < 1050:
             line = line.replace('₹ 0', '₹ {balance.toFixed(2)}')
        
        # Hook up inputs - using more specific replacement to avoid issues
        if 'className="amount-input"' in line and 900 < i < 1050:
             if 'value=' not in line:
                 line = line.replace('className="amount-input"', 'className="amount-input" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)}')
        
        # Hook up buttons
        if 'className="withdraw-button"' in line and 900 < i < 1050:
             if 'onClick=' not in line:
                 line = line.replace('className="withdraw-button"', 'className="withdraw-button" onClick={handleWithdraw}')
                 
        new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)
